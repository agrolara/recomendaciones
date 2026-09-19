import { getGroups, getCampaigns, saveLead, getSettings, updateGroupWatermark, cleanOldLeads } from './db.js';
import { matchPostToCampaign } from './matcher.js';
import { generateAiReply } from './ai.js';

let isScanning = false;

/**
 * Escáner de grupos de Facebook de alta precisión:
 * 1. Muro Cronológico (?sorting_setting=CHRONOLOGICAL): Lee publicaciones en tiempo real desde la más reciente.
 * 2. Marca de Agua (Watermark): Recuerda la última publicación vista para detenerse y no revisar hacia atrás.
 * 3. Corte Estricto de Antigüedad: Descarta inmediatamente cualquier publicación mayor a 2-3 horas.
 * 4. Multi-campaña: Evalúa todas las campañas activas en una sola pasada.
 */
export async function runScanner(customPage = null) {
  if (isScanning) {
    return { success: false, message: "Escaneo ya en curso" };
  }

  isScanning = true;
  console.log("=================================================");
  console.log("⚡ [Scanner] Iniciando escaneo cronológico inteligente...");
  console.log("=================================================");

  const foundLeads = [];
  const currentEpoch = Math.floor(Date.now() / 1000);

  try {
    const groups = await getGroups();
    const campaigns = await getCampaigns();
    const settings = await getSettings();

    const maxAgeMinutesAllowed = settings.time_window_margin_minutes || 180; // Máximo 3 horas por defecto
    const activeGroups = groups.filter(g => g.is_active);
    const activeCampaigns = campaigns.filter(c => c.is_active);

    if (activeCampaigns.length === 0) {
      console.warn("[Scanner] No hay campañas activas configuradas.");
      return { success: false, message: "No hay campañas activas configuradas" };
    }

    // Dynamic import of OpenCLI Page if available locally
    let PageClass = null;
    try {
      const module = await import('file:///C:/Users/Usuario/AppData/Roaming/npm/node_modules/@jackwener/opencli/dist/src/browser/page.js');
      PageClass = module.Page;
    } catch (e) {
      console.warn("[Scanner] OpenCLI local no disponible en este entorno:", e.message);
    }

    if (!PageClass && !customPage) {
      console.log("[Scanner] Modo Cloud activo.");
      return { success: true, message: "Modo nube activo", found: 0 };
    }

    const page = customPage || new PageClass('b9mz6zfk');

    for (const group of activeGroups) {
      console.log(`\n🔍 [Scanner] Grupo: ${group.name} (${group.id})`);

      // Marca de agua: Si no existe, revisar como máximo las últimas 3 horas
      const watermarkTime = group.last_scanned_time || (currentEpoch - (maxAgeMinutesAllowed * 60));
      const watermarkPostId = group.last_scanned_post_id || null;

      console.log(`   ⏱️ Marca de agua: ${group.last_scanned_time ? new Date(group.last_scanned_time * 1000).toLocaleTimeString('es-CL') : 'Primera vez (últimas 3h)'}`);

      // 1. Navegar al feed cronológico ("Publicaciones nuevas")
      const chronoUrl = `https://www.facebook.com/groups/${group.id}/?sorting_setting=CHRONOLOGICAL`;
      await page.goto(chronoUrl, { waitUntil: 'load', settleMs: 3000 }).catch(console.error);
      await new Promise(r => setTimeout(r, 2500));

      let newestPostIdSeen = null;
      let reachedWatermark = false;

      // Scroll inteligente: hasta 7 iteraciones progresivas hacia abajo para cubrir grupos de alto tráfico
      for (let scrollStep = 0; scrollStep < 7; scrollStep++) {
        const extractedPosts = await page.evaluate(({ currentEpoch }) => {
          // Extraer datos Relay de los scripts
          const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerText);
          const relayStories = [];
          for (const sc of scripts) {
            if (!sc.includes('"post_id"')) continue;
            const regex = /"owning_profile":\{"__typename":"User","name":"([^"]+)"[\s\S]*?"post_id":"(\d+)"[\s\S]*?"creation_time":(\d+)/g;
            let m;
            while ((m = regex.exec(sc)) !== null) {
              if (m[0].length < 1500) {
                relayStories.push({
                  author: m[1],
                  postId: m[2],
                  creationTime: parseInt(m[3], 10),
                  dateString: new Date(parseInt(m[3], 10) * 1000).toLocaleString('es-CL')
                });
              }
            }
          }

          const feed = document.querySelector('div[role="feed"]');
          if (!feed) return [];
          const cards = Array.from(feed.children);
          const items = [];

          for (const card of cards) {
            let text = (card.innerText || '').replace(/(?:Facebook\s*)+/gi, '').trim();
            if (text.length < 15 || text.includes('ordenar feed') || text.includes('Filtros')) continue;

            const userLinks = Array.from(card.querySelectorAll('a[href*="/user/"]'));
            const authorEl = userLinks.find(a => a.innerText && a.innerText.trim().length > 2);
            let author = authorEl ? authorEl.innerText.trim() : 'Vecino';
            author = author.replace(/^(?:Publicación de|Comentario de)\s*/i, '').trim();

            let matchedStory = relayStories.find(s => s.author.toLowerCase() === author.toLowerCase());
            let postId = matchedStory ? matchedStory.postId : null;
            let creationTime = matchedStory ? matchedStory.creationTime : null;

            if (!postId) {
              const links = Array.from(card.querySelectorAll('a[href]'));
              for (const a of links) {
                const m1 = a.href.match(/\/(?:posts|permalink)\/(\d+)/);
                if (m1) { postId = m1[1]; break; }
                const m2 = a.href.match(/set=gm\.(\d+)/);
                if (m2) { postId = m2[1]; break; }
                const m3 = a.href.match(/pcb\.(\d+)/);
                if (m3) { postId = m3[1]; break; }
              }
            }

            if (!postId) {
              const cardHtml = card.outerHTML || '';
              const mHtml = cardHtml.match(/(?:post_id|story_fbid|posts|permalink)[:/\"=]+(\d{10,})/);
              if (mHtml) postId = mHtml[1];
            }

            if (!postId) continue;

            let ageSeconds = creationTime ? (currentEpoch - creationTime) : null;
            let ageMinutes = ageSeconds != null ? Math.floor(ageSeconds / 60) : null;

            // Detección de antigüedad basada en texto relativo (ej: "25 min", "hace 1 h")
            if (ageMinutes == null) {
              const matchMin = text.match(/(\d+)\s*(?:min|m)(?:\s|\.|$)/i) || text.match(/hace\s*(\d+)\s*min/i);
              const matchHours = text.match(/(\d+)\s*(?:h|hrs?|horas?)(?:\s|\.|$)/i) || text.match(/hace\s*(\d+)\s*h/i);
              const matchDays = text.match(/(\d+)\s*(?:d|d[ií]as?)(?:\s|\.|$)/i) || text.match(/hace\s*(\d+)\s*d/i);
              if (matchMin) {
                ageMinutes = parseInt(matchMin[1], 10);
                ageSeconds = ageMinutes * 60;
              } else if (matchHours) {
                ageMinutes = parseInt(matchHours[1], 10) * 60;
                ageSeconds = ageMinutes * 60;
              } else if (matchDays) {
                ageMinutes = parseInt(matchDays[1], 10) * 1440;
                ageSeconds = ageMinutes * 60;
              }
            }

            let timeLabel = 'Reciente';
            if (ageMinutes != null) {
              if (ageMinutes < 1) timeLabel = 'Hace segundos';
              else if (ageMinutes < 60) timeLabel = `Hace ${ageMinutes} min`;
              else if (ageMinutes < 120) timeLabel = `Hace 1 h ${ageMinutes % 60} min`;
              else if (ageMinutes < 1440) timeLabel = `Hace ${Math.floor(ageMinutes / 60)} h ${ageMinutes % 60} min`;
              else timeLabel = `Hace ${Math.floor(ageMinutes / 1440)} días`;
            } else if (matchedStory && matchedStory.dateString) {
              timeLabel = matchedStory.dateString;
            }

            items.push({
              postId,
              author,
              creationTime,
              ageSeconds: ageSeconds != null ? ageSeconds : 0,
              ageMinutes: ageMinutes != null ? ageMinutes : 0,
              timeLabel,
              text: text.slice(0, 400).replace(/\n+/g, ' ')
            });
          }

          return items;
        }, { currentEpoch });

        for (const post of extractedPosts) {
          if (!newestPostIdSeen) {
            newestPostIdSeen = post.postId;
          }

          // Verificar si ya llegamos a la marca de agua anterior
          if (watermarkPostId && post.postId === watermarkPostId) {
            console.log(`   🛑 Llegamos a la última publicación procesada anteriormente (ID: ${post.postId}).`);
            reachedWatermark = true;
            break;
          }

          if (post.creationTime && post.creationTime <= watermarkTime) {
            console.log(`   🛑 Publicación fuera de la ventana reciente (${post.timeLabel}). Deteniendo scroll.`);
            reachedWatermark = true;
            break;
          }

          // CORTE ESTRICTO DE TIEMPO: Si la publicación supera el límite de horas, NO procesar
          if (post.ageMinutes > maxAgeMinutesAllowed) {
            continue;
          }

          // Evaluar intención y campaña
          const matchResult = matchPostToCampaign(post.text, activeCampaigns);
          if (matchResult.isMatch) {
            const matchedCampaign = matchResult.campaign;
            console.log(`   🎯 ¡LEAD RECIENTE ENCONTRADO! [${matchedCampaign.name}] Autor: ${post.author} (${post.timeLabel})`);

            const aiResult = await generateAiReply({
              authorName: post.author,
              postText: post.text,
              campaign: matchedCampaign
            });

            const cleanUrl = `https://www.facebook.com/groups/${group.id}/posts/${post.postId}/`;

            let status = 'pending';

            // MODO AUTO-CONTESTAR: Si el usuario activó la respuesta automática
            if (settings.auto_reply_enabled && PageClass) {
              console.log(`   🤖 [Auto-Responder] Modo Automático ACTIVO: Publicando respuesta para ${post.author}...`);
              try {
                const { publishComment } = await import('./commenter.js');
                const commentRes = await publishComment({
                  postId: post.postId,
                  postDirectUrl: cleanUrl,
                  commentText: aiResult.reply
                });
                if (commentRes && commentRes.success) {
                  status = 'commented';
                  console.log(`   ✅ [Auto-Responder] ¡Comentario publicado automáticamente con éxito!`);
                }
              } catch (pubErr) {
                console.warn(`   ⚠️ [Auto-Responder] No se pudo auto-contestar:`, pubErr.message);
              }
            }

            const leadRecord = {
              id: 'lead_' + post.postId,
              campaign_id: matchedCampaign.id,
              campaign_name: matchedCampaign.name,
              campaign_icon: matchedCampaign.icon || '🏷️',
              brand_name: matchedCampaign.brand_name,
              brand_tag: matchedCampaign.brand_tag,
              phone: matchedCampaign.phone,
              post_id: post.postId,
              author: post.author,
              authorAvatar: post.author.slice(0, 2).toUpperCase(),
              group_name: group.name,
              zone: group.zone,
              post_direct_url: cleanUrl,
              content: post.text.slice(0, 300),
              exact_time: post.timeLabel,
              age_seconds: post.ageSeconds,
              age_minutes: post.ageMinutes,
              is_recent_2h: post.ageMinutes <= 120,
              is_recent_4h: post.ageMinutes <= 240,
              generated_reply: aiResult.reply,
              ai_model_used: aiResult.modelUsed,
              is_ai: aiResult.isAi,
              status,
              created_at: new Date().toISOString()
            };

            await saveLead(leadRecord);
            foundLeads.push(leadRecord);
          }
        }

        if (reachedWatermark) break;

        // Scroll para cargar siguientes publicaciones del muro
        await page.evaluate(() => window.scrollBy(0, 1400));
        await new Promise(r => setTimeout(r, 1500));
      }

      // 2. Búsqueda dirigida interna en el grupo (In-Group Search)
      // Garantiza encontrar solicitudes de servicios específicos (ej: taxi, uber) aunque se hayan sepultado
      // bajo decenas de publicaciones de ropa o comida en grupos de alto volumen como Quilicura Vende.
      const searchKeywords = ['taxi', 'uber'];
      for (const kw of searchKeywords) {
        try {
          const searchUrl = `https://www.facebook.com/groups/${group.id}/search/?q=${encodeURIComponent(kw)}`;
          await page.goto(searchUrl, { waitUntil: 'load', settleMs: 2500 }).catch(() => {});
          await new Promise(r => setTimeout(r, 2000));

          const searchPosts = await page.evaluate(({ currentEpoch }) => {
            const allDivs = Array.from(document.querySelectorAll('div[role="feed"] > div, div[role="article"], div.x1yztbdb'));
            const results = [];
            for (const card of allDivs) {
              const text = (card.innerText || '').replace(/(?:Facebook\s*)+/gi, '').trim();
              if (text.length < 15 || text.includes('Resultados de búsqueda') || text.includes('Filtros')) continue;

              const userLinks = Array.from(card.querySelectorAll('a[href*="/user/"]'));
              const authorEl = userLinks.find(a => a.innerText && a.innerText.trim().length > 2);
              let author = authorEl ? authorEl.innerText.trim() : 'Vecino';
              author = author.replace(/^(?:Publicación de|Comentario de)\s*/i, '').trim();

              const links = Array.from(card.querySelectorAll('a[href]'));
              let postId = null;
              for (const a of links) {
                const m1 = a.href.match(/\/(?:posts|permalink)\/(\d+)/);
                if (m1) { postId = m1[1]; break; }
                const m2 = a.href.match(/set=pcb\.(\d+)/) || a.href.match(/set=gm\.(\d+)/);
                if (m2) { postId = m2[1]; break; }
              }
              if (!postId) {
                const cardHtml = card.outerHTML || '';
                const mHtml = cardHtml.match(/(?:post_id|story_fbid|posts|permalink)[:/\"=]+(\d{10,})/);
                if (mHtml) postId = mHtml[1];
              }
              if (!postId) continue;

              let ageMinutes = 30; // valor razonable de búsqueda
              const matchMin = text.match(/(\d+)\s*(?:min|m)(?:\s|\.|$)/i) || text.match(/hace\s*(\d+)\s*min/i);
              const matchHours = text.match(/(\d+)\s*(?:h|hrs?|horas?)(?:\s|\.|$)/i) || text.match(/hace\s*(\d+)\s*h/i);
              if (matchMin) ageMinutes = parseInt(matchMin[1], 10);
              else if (matchHours) ageMinutes = parseInt(matchHours[1], 10) * 60;

              results.push({
                postId,
                author,
                ageMinutes,
                ageSeconds: ageMinutes * 60,
                timeLabel: `Hace ${ageMinutes} min`,
                text: text.slice(0, 400).replace(/\n+/g, ' ')
              });
            }
            return results;
          }, { currentEpoch });

          for (const sp of searchPosts) {
            if (sp.ageMinutes > maxAgeMinutesAllowed) continue;
            const matchResult = matchPostToCampaign(sp.text, activeCampaigns);
            if (matchResult.isMatch && !foundLeads.some(l => l.post_id === sp.postId)) {
              const matchedCampaign = matchResult.campaign;
              console.log(`   🎯 ¡LEAD RECIENTE ENCONTRADO EN BÚSQUEDA INTERNA! [${matchedCampaign.name}] Autor: ${sp.author} (${sp.timeLabel})`);

              const aiResult = await generateAiReply({
                authorName: sp.author,
                postText: sp.text,
                campaign: matchedCampaign
              });

              const cleanUrl = `https://www.facebook.com/groups/${group.id}/posts/${sp.postId}/`;

              let status = 'pending';
              if (settings.auto_reply_enabled && PageClass) {
                console.log(`   🤖 [Auto-Responder] Publicando respuesta para ${sp.author}...`);
                try {
                  const { publishComment } = await import('./commenter.js');
                  const commentRes = await publishComment({
                    postId: sp.postId,
                    postDirectUrl: cleanUrl,
                    commentText: aiResult.reply
                  });
                  if (commentRes && commentRes.success) status = 'commented';
                } catch (e) {}
              }

              const leadRecord = {
                id: `lead_${sp.postId}`,
                campaign_id: matchedCampaign.id,
                campaign_name: matchedCampaign.name,
                campaign_icon: matchedCampaign.icon || '🏷️',
                brand_name: matchedCampaign.brand_name,
                brand_tag: matchedCampaign.brand_tag,
                phone: matchedCampaign.phone,
                post_id: sp.postId,
                author: sp.author,
                authorAvatar: sp.author.slice(0, 2).toUpperCase(),
                group_name: group.name,
                zone: group.zone,
                post_direct_url: cleanUrl,
                content: sp.text.slice(0, 300),
                exact_time: sp.timeLabel,
                age_seconds: sp.ageSeconds,
                age_minutes: sp.ageMinutes,
                is_recent_2h: sp.ageMinutes <= 120,
                is_recent_4h: sp.ageMinutes <= 240,
                generated_reply: aiResult.reply,
                ai_model_used: aiResult.modelUsed,
                is_ai: aiResult.isAi,
                status,
                created_at: new Date().toISOString()
              };

              await saveLead(leadRecord);
              foundLeads.push(leadRecord);
            }
          }
        } catch (e) {
          // Continuar con el siguiente grupo si la búsqueda interna falla
        }
      }

      // 3. Actualizar marca de agua del grupo
      await updateGroupWatermark(group.id, {
        last_scanned_time: currentEpoch,
        last_scanned_post_id: newestPostIdSeen || watermarkPostId
      });
    }

    // 4. Limpiar leads obsoletos mayores a 24 horas para mantener el panel limpio y fresco
    await cleanOldLeads(24);

  } catch (err) {
    console.error("[Scanner] Error durante escaneo:", err);
  } finally {
    isScanning = false;
  }

  console.log(`\n✅ [Scanner] Escaneo finalizado. Nuevos leads encontrados: ${foundLeads.length}\n`);
  return { success: true, found: foundLeads.length };
}

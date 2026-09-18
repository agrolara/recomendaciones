import { getGroups, getCampaigns, saveLead, getSettings } from './db.js';
import { matchPostToCampaign } from './matcher.js';
import { generateAiReply } from './ai.js';

let isScanning = false;

export async function runScanner(customPage = null) {
  if (isScanning) {
    return { success: false, message: "Escaneo ya en curso" };
  }

  isScanning = true;
  console.log("[Scanner] Iniciando escaneo multifuncional de campañas...");

  const foundLeads = [];
  const currentEpoch = Math.floor(Date.now() / 1000);

  try {
    const groups = await getGroups();
    const campaigns = await getCampaigns();
    const settings = await getSettings();

    const activeGroups = groups.filter(g => g.is_active).slice(0, 6);
    const activeCampaigns = campaigns.filter(c => c.is_active);

    if (activeCampaigns.length === 0) {
      console.warn("[Scanner] No hay campañas activas.");
      return { success: false, message: "No hay campañas activas configuradas" };
    }

    // Strategic transportation and delivery queries (always prioritized)
    const TRANSPORT_CORE_QUERIES = [
      'uber',
      'carrera',
      'carreras',
      'movil',
      'móvil',
      'traslado',
      'traslados',
      'radiotaxi',
      'taxi',
      'delivery',
      'encomienda'
    ];

    const strategicQueries = new Set(TRANSPORT_CORE_QUERIES);

    // Also include top keywords from other active campaigns (food, home services, etc.)
    for (const c of activeCampaigns) {
      if (c.id !== 'camp_radiotaxi' && Array.isArray(c.keywords)) {
        c.keywords.slice(0, 2).forEach(k => strategicQueries.add(k));
      }
    }
    const searchQueries = Array.from(strategicQueries);

    // Dynamic import of OpenCLI Page if available locally
    let PageClass = null;
    try {
      const module = await import('file:///C:/Users/Usuario/AppData/Roaming/npm/node_modules/@jackwener/opencli/dist/src/browser/page.js');
      PageClass = module.Page;
    } catch (e) {
      console.warn("[Scanner] OpenCLI local no disponible en este entorno:", e.message);
    }

    if (!PageClass && !customPage) {
      console.log("[Scanner] Ejecutando en modo Cloud/Sin navegador local directo.");
      return { success: true, message: "Modo nube activo", found: 0 };
    }

    const page = customPage || new PageClass('b9mz6zfk');

    for (const group of activeGroups) {
      console.log(`[Scanner] Grupo: ${group.name} (${group.id})...`);

      for (const query of searchQueries) {
        const searchUrl = `https://www.facebook.com/groups/${group.id}/search/?q=${encodeURIComponent(query)}`;
        console.log(`[Scanner] -> Buscando término "${query}" en ${group.name}...`);

        await page.goto(searchUrl, { waitUntil: 'load', settleMs: 3000 }).catch(console.error);
        await new Promise(r => setTimeout(r, 2000));

        const extractedLeads = await page.evaluate(({ groupInfo, currentEpoch }) => {
          // Extract Relay stories from script tags
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

          // Extract visible cards in feed
          const feed = document.querySelector('div[role="feed"]');
          const cards = feed ? Array.from(feed.children) : [];
          const items = [];

          for (const card of cards) {
            let text = (card.innerText || '').replace(/(?:Facebook\s*)+/gi, '').trim();
            if (text.length < 25 || text.includes('Filtros') || text.includes('Resultados de búsqueda')) continue;

            const userLinks = Array.from(card.querySelectorAll('a[href*="/user/"]'));
            const authorEl = userLinks.find(a => a.innerText && a.innerText.trim().length > 2);
            let author = authorEl ? authorEl.innerText.trim() : 'Vecino de ' + groupInfo.zone;
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

            if (!postId) continue;

            const ageSeconds = creationTime ? (currentEpoch - creationTime) : null;
            const ageMinutes = ageSeconds != null ? Math.floor(ageSeconds / 60) : null;

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

            const cleanUrl = `https://www.facebook.com/groups/${groupInfo.id}/posts/${postId}/`;

            items.push({
              postId,
              author,
              creationTime,
              ageSeconds: ageSeconds != null ? ageSeconds : 999999,
              ageMinutes: ageMinutes != null ? ageMinutes : 999999,
              timeLabel,
              cleanUrl,
              text: text.slice(0, 400).replace(/\n+/g, ' ')
            });
          }

          return items;
        }, { groupInfo: group, currentEpoch });

        for (const lead of extractedLeads) {
          const matchResult = matchPostToCampaign(lead.text, activeCampaigns);
          if (matchResult.isMatch) {
            const matchedCampaign = matchResult.campaign;
            console.log(`[Scanner] ¡LEAD ENCONTRADO! Campaña: ${matchedCampaign.name} | Autor: ${lead.author} | Tiempo: ${lead.timeLabel}`);

            // AI generation of recommendation
            const aiResult = await generateAiReply({
              authorName: lead.author,
              postText: lead.text,
              campaign: matchedCampaign
            });

            const marginMinutes = settings.time_window_margin_minutes || 150;
            const is2h = lead.ageMinutes <= marginMinutes;

            const leadRecord = {
              id: 'lead_' + lead.postId,
              campaign_id: matchedCampaign.id,
              campaign_name: matchedCampaign.name,
              campaign_icon: matchedCampaign.icon || '🏷️',
              brand_name: matchedCampaign.brand_name,
              brand_tag: matchedCampaign.brand_tag,
              phone: matchedCampaign.phone,
              post_id: lead.postId,
              author: lead.author,
              authorAvatar: lead.author.slice(0, 2).toUpperCase(),
              group_name: group.name,
              zone: group.zone,
              post_direct_url: lead.cleanUrl,
              content: lead.text.slice(0, 300),
              exact_time: lead.timeLabel,
              age_seconds: lead.ageSeconds,
              age_minutes: lead.ageMinutes,
              is_recent_2h: is2h,
              is_recent_4h: lead.ageMinutes <= 240,
              generated_reply: aiResult.reply,
              ai_model_used: aiResult.modelUsed,
              is_ai: aiResult.isAi,
              status: 'pending',
              created_at: new Date().toISOString()
            };

            await saveLead(leadRecord);
            foundLeads.push(leadRecord);
          }
        }
      }
    }
  } catch (err) {
    console.error("[Scanner] Error durante escaneo:", err);
  } finally {
    isScanning = false;
  }

  return { success: true, found: foundLeads.length };
}

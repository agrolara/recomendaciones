import { updateLeadStatus } from './db.js';

export async function publishComment({ postId, postDirectUrl, commentText, customPage = null }) {
  console.log(`[Commenter] Solicitud de publicación para: ${postDirectUrl}`);

  if (!postDirectUrl || (!postDirectUrl.includes('/posts/') && !postDirectUrl.includes('/permalink/'))) {
    throw new Error("SEGURIDAD ACTIVADA: El enlace recibido (" + postDirectUrl + ") es una portada de grupo y no una publicación directa. Se canceló para no comentar en un post ajeno.");
  }

  let page = customPage;
  if (!page) {
    let PageClass = null;
    try {
      const module = await import('file:///C:/Users/Usuario/AppData/Roaming/npm/node_modules/@jackwener/opencli/dist/src/browser/page.js');
      PageClass = module.Page;
    } catch (e) {
      throw new Error("OpenCLI no está disponible en este entorno local para automatizar el navegador.");
    }
    page = new PageClass('b9mz6zfk');
  }

  console.log(`[Commenter] Navegando a ${postDirectUrl}...`);
  await page.goto(postDirectUrl, { waitUntil: 'load', settleMs: 3000 });
  await new Promise(r => setTimeout(r, 2500));

  const currentUrl = await page.evaluate(() => location.href).catch(() => '');
  if (!currentUrl.includes('/posts/') && !currentUrl.includes('/permalink/')) {
    throw new Error("SEGURIDAD ACTIVADA: Facebook redirigió a la portada del grupo (la publicación fue borrada o expiró). Se canceló el comentario para proteger el grupo de respuestas erróneas.");
  }

  const insertRes = await page.evaluate(async (text) => {
    const root = document.querySelector('div[role="dialog"]') || document.querySelector('div[role="main"]') || document.body;
    let tb = root.querySelector('div[role="textbox"][contenteditable="true"]');
    if (!tb) {
      const btn = root.querySelector('div[aria-label*="Dejar un comentario"], div[aria-label*="Comentar"]');
      if (btn) {
        btn.click();
        await new Promise(r => setTimeout(r, 900));
      }
      tb = root.querySelector('div[role="textbox"][contenteditable="true"]');
    }

    if (!tb) {
      return { ok: false, error: 'No se encontró la caja de comentarios en la publicación.' };
    }

    tb.focus();

    const pEl = tb.querySelector('p') || tb;
    const range = document.createRange();
    range.selectNodeContents(pEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('delete', false, null);

    const inserted = document.execCommand('insertText', false, text);
    return { ok: true, inserted, currentText: tb.innerText };
  }, commentText);

  console.log("[Commenter] Resultado inserción:", insertRes);

  if (!insertRes.ok) {
    throw new Error(insertRes.error || 'No se pudo escribir en el comentario');
  }

  await new Promise(r => setTimeout(r, 1200));

  const sendRes = await page.evaluate(async () => {
    const root = document.querySelector('div[role="dialog"]') || document.querySelector('div[role="main"]') || document.body;
    const sendBtn = root.querySelector('div[aria-label="Publicar comentario"], div[aria-label*="Publicar comentario"], div[aria-label="Publicar"]');
    if (sendBtn) {
      sendBtn.click();
      return { ok: true, method: 'button_click' };
    }
    const tb = root.querySelector('div[role="textbox"][contenteditable="true"]');
    if (tb) {
      tb.focus();
      tb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      tb.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      return { ok: true, method: 'enter_dispatched' };
    }
    return { ok: false, method: 'none' };
  });

  console.log("[Commenter] Envío:", sendRes);

  await page.pressKey('Enter').catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  if (postId) {
    await updateLeadStatus(postId, 'commented');
  }

  return {
    success: true,
    message: 'Comentario publicado en Facebook con éxito',
    timestamp: new Date().toLocaleTimeString('es-CL')
  };
}

import { runScanner } from './scanner.js';
import { publishComment } from './commenter.js';
import { getLeads, getSettings, saveSettings } from './db.js';

const REMOTE_URL = process.env.REMOTE_URL || 'https://recomendaciones.agrolara.dedyn.io';

console.log("=================================================");
console.log("🚀 Agente Local de Automatización Facebook");
console.log(`🌐 Servidor Cloud: ${REMOTE_URL}`);
console.log("=================================================");

let isBusy = false;
let lastAutoScan = 0;
const AUTO_SCAN_INTERVAL = 20 * 60 * 1000; // 20 minutes

/**
 * Pings heartbeat to the cloud server
 */
async function sendHeartbeat() {
  try {
    await fetch(`${REMOTE_URL}/api/agent/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: Date.now() })
    });
  } catch (e) {
    // Cloud server might be momentarily rebooting
  }
}

/**
 * Syncs settings from the cloud server (e.g. OpenRouter API Key entered in cloud UI)
 */
async function syncRemoteSettings() {
  try {
    const res = await fetch(`${REMOTE_URL}/api/settings`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.settings && data.settings.openrouter_api_key) {
      const localSettings = await getSettings();
      if (localSettings.openrouter_api_key !== data.settings.openrouter_api_key) {
        console.log("[Agente Local] Sincronizando OpenRouter API Key desde el servidor Cloud...");
        await saveSettings({
          openrouter_api_key: data.settings.openrouter_api_key,
          openrouter_model: data.settings.openrouter_model || "deepseek/deepseek-chat"
        });
      }
    }
  } catch (e) {}
}

/**
 * Checks for pending jobs (scan or comment) from the cloud queue
 */
async function processCloudQueue() {
  if (isBusy) return;

  try {
    const res = await fetch(`${REMOTE_URL}/api/jobs/pending`);
    if (!res.ok) return;
    const data = await res.json();

    if (data.job) {
      const job = data.job;
      console.log(`[Agente Local] ¡Trabajo recibido del Cloud! Tipo: ${job.type} (ID: ${job.id})`);
      isBusy = true;

      if (job.type === 'scan') {
        console.log("[Agente Local] Ejecutando escaneo solicitado desde el panel web...");
        try {
          const scanRes = await runScanner();
          const allLeads = await getLeads();

          // Sync leads to cloud server
          await fetch(`${REMOTE_URL}/api/jobs/${job.id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              found: scanRes.found || 0,
              leads: allLeads
            })
          });
          console.log(`[Agente Local] Escaneo completado y ${allLeads.length} leads sincronizados al Cloud.`);
        } catch (err) {
          console.error("[Agente Local] Error en escaneo:", err.message);
          await fetch(`${REMOTE_URL}/api/jobs/${job.id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message })
          });
        }
      } else if (job.type === 'comment') {
        console.log(`[Agente Local] Publicando comentario en Facebook: ${job.postDirectUrl}`);
        try {
          const commentRes = await publishComment({
            postId: job.postId,
            postDirectUrl: job.postDirectUrl,
            commentText: job.commentText
          });
          await fetch(`${REMOTE_URL}/api/jobs/${job.id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, result: commentRes })
          });
          console.log("[Agente Local] Comentario publicado con éxito.");
        } catch (err) {
          console.error("[Agente Local] Error publicando comentario:", err.message);
          await fetch(`${REMOTE_URL}/api/jobs/${job.id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: err.message })
          });
        }
      }

      isBusy = false;
    }
  } catch (e) {
    isBusy = false;
  }
}

/**
 * Periodically syncs all local leads to the cloud server
 */
async function syncLeadsToCloud() {
  try {
    const leads = await getLeads();
    if (leads.length > 0) {
      await fetch(`${REMOTE_URL}/api/leads/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads })
      });
    }
  } catch(e) {}
}

/**
 * Periodic automated scanner loop
 */
async function checkAutoScan() {
  if (isBusy) return;
  const now = Date.now();
  if (now - lastAutoScan > AUTO_SCAN_INTERVAL) {
    lastAutoScan = now;
    console.log("[Agente Local] Iniciando escaneo periódico automático de Facebook...");
    isBusy = true;
    try {
      await runScanner();
      await syncLeadsToCloud();
      console.log("[Agente Local] Escaneo periódico finalizado con éxito.");
    } catch (e) {
      console.error("[Agente Local] Error en escaneo periódico:", e.message);
    } finally {
      isBusy = false;
    }
  }
}

// MAIN RUNNER LOOP
async function startDaemon() {
  console.log("🟢 Daemon del Agente Local iniciado.");
  console.log("   - Enlazado con Chrome & Facebook Personal");
  console.log("   - Escuchando órdenes desde el panel web Cloud");
  console.log("   - Escaneo periódico automático activo cada 20 min");

  // Initial sync
  await syncRemoteSettings();
  await sendHeartbeat();
  await syncLeadsToCloud();

  // Loop every 5 seconds
  setInterval(async () => {
    await sendHeartbeat();
    await syncRemoteSettings();
    await processCloudQueue();
    await checkAutoScan();
  }, 5000);
}

const arg = process.argv[2];

if (arg === '--scan') {
  console.log("[Agente Local] Ejecutando escaneo manual...");
  runScanner().then(async res => {
    console.log("[Agente Local] Escaneo finalizado:", res);
    await syncLeadsToCloud();
    process.exit(0);
  }).catch(err => {
    console.error("[Agente Local] Error:", err.message);
    process.exit(1);
  });
} else {
  // Default: start background daemon
  startDaemon();
}

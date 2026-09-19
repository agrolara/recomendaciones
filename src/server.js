import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

import {
  initDatabase,
  getCampaigns,
  saveCampaign,
  deleteCampaign,
  getGroups,
  addGroup,
  deleteGroup,
  getLeads,
  saveLead,
  deleteLead,
  clearAllLeads,
  updateLeadStatus,
  getSettings,
  saveSettings
} from './db.js';

import { runScanner } from './scanner.js';
import { publishComment } from './commenter.js';
import { testOpenRouterKey, generateAiReply, SUPPORTED_AI_MODELS } from './ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check for Docker / Coolify
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Recomendaciones AI Platform', version: '1.0.0', time: new Date() });
});

// CAMPAIGNS
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await getCampaigns();
    res.json(campaigns);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/campaigns', async (req, res) => {
  try {
    const saved = await saveCampaign(req.body);
    res.json({ success: true, campaign: saved });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/campaigns/:id', async (req, res) => {
  try {
    await deleteCampaign(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GROUPS
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await getGroups();
    res.json(groups);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const { urlOrId } = req.body;
    let id = (urlOrId || '').trim();
    if (id.includes('/groups/')) {
      const m = id.match(/groups\/([^\/?#]+)/);
      if (m) id = m[1];
    }
    if (!id) throw new Error("Enlace o ID de grupo inválido");

    let zone = "Santiago Norte";
    if (/campino|blc/i.test(urlOrId)) zone = "Valle Lo Campino";
    if (/grande/i.test(urlOrId)) zone = "Valle Grande";
    if (/quilicura/i.test(urlOrId)) zone = "Quilicura";

    let name = "Grupo Facebook " + id;
    if (id === "269357883401410") name = "QUILICURA VENDE y COMPRA de todo ..";

    const group = await addGroup({
      id,
      name,
      zone,
      url: urlOrId.startsWith('http') ? urlOrId : `https://www.facebook.com/groups/${id}/`,
      is_active: true
    });

    res.json({ success: true, group });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/groups/:id', async (req, res) => {
  try {
    await deleteGroup(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// LEADS
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await getLeads();
    res.json(leads);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/leads/status', async (req, res) => {
  try {
    const { id, status } = req.body;
    const updated = await updateLeadStatus(id, status);
    res.json({ success: true, lead: updated });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/leads', async (req, res) => {
  try {
    await clearAllLeads();
    res.json({ success: true, message: "Todas las publicaciones fueron eliminadas" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    await deleteLead(req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

let lastAgentHeartbeat = 0;
let pendingJobs = [];

// AGENT HEARTBEAT & STATUS
app.post('/api/agent/heartbeat', (req, res) => {
  lastAgentHeartbeat = Date.now();
  res.json({ ok: true, serverTime: Date.now() });
});

app.get('/api/agent/status', (req, res) => {
  const isOnline = (Date.now() - lastAgentHeartbeat) < 30000;
  res.json({
    online: isOnline,
    lastSeenSecondsAgo: lastAgentHeartbeat ? Math.round((Date.now() - lastAgentHeartbeat) / 1000) : null,
    pendingJobs: pendingJobs.filter(j => j.status === 'pending').length
  });
});

// JOB QUEUE (Bridge between Cloud and Local Agent)
app.get('/api/jobs/pending', (req, res) => {
  const job = pendingJobs.find(j => j.status === 'pending');
  if (job) {
    job.status = 'processing';
  }
  res.json({ job: job || null });
});

app.post('/api/jobs/:id/complete', async (req, res) => {
  const { leads, found, error } = req.body;
  const job = pendingJobs.find(j => j.id === req.params.id);
  if (job) {
    job.status = error ? 'failed' : 'completed';
    job.error = error;
    job.completed_at = Date.now();
    job.found = found ?? (leads ? leads.length : 0);
  }
  if (Array.isArray(leads)) {
    for (const l of leads) {
      await saveLead(l);
    }
  }
  res.json({ success: true });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = pendingJobs.find(j => j.id === req.params.id);
  res.json(job || { status: 'not_found' });
});

// SYNC LEADS
app.post('/api/leads/sync', async (req, res) => {
  try {
    const { leads } = req.body;
    let count = 0;
    if (Array.isArray(leads)) {
      for (const l of leads) {
        await saveLead(l);
        count++;
      }
    }
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SCANNER (DUAL MODE: LOCAL DIRECT OR CLOUD QUEUE)
app.post('/api/scan', async (req, res) => {
  try {
    let PageClass = null;
    try {
      const module = await import('file:///C:/Users/Usuario/AppData/Roaming/npm/node_modules/@jackwener/opencli/dist/src/browser/page.js');
      PageClass = module.Page;
    } catch(e) {}

    if (PageClass) {
      // Local server with browser connected
      const result = await runScanner();
      res.json({ ...result, mode: 'local' });
    } else {
      // Cloud server: Queue job for local agent
      const job = {
        id: 'scan_' + Date.now(),
        type: 'scan',
        status: 'pending',
        created_at: Date.now()
      };
      pendingJobs.push(job);
      if (pendingJobs.length > 25) pendingJobs.shift();
      res.json({
        success: true,
        queued: true,
        jobId: job.id,
        message: "Escaneo solicitado a tu Agente Local con Facebook...",
        mode: 'cloud_queue'
      });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// COMMENTER (DUAL MODE: LOCAL DIRECT OR CLOUD QUEUE)
app.post('/api/comment', async (req, res) => {
  try {
    const { postId, postDirectUrl, commentText } = req.body;

    let PageClass = null;
    try {
      const module = await import('file:///C:/Users/Usuario/AppData/Roaming/npm/node_modules/@jackwener/opencli/dist/src/browser/page.js');
      PageClass = module.Page;
    } catch(e) {}

    if (PageClass) {
      const result = await publishComment({ postId, postDirectUrl, commentText });
      res.json({ ...result, mode: 'local' });
    } else {
      const job = {
        id: 'comment_' + Date.now(),
        type: 'comment',
        postId,
        postDirectUrl,
        commentText,
        status: 'pending',
        created_at: Date.now()
      };
      pendingJobs.push(job);
      if (pendingJobs.length > 25) pendingJobs.shift();
      res.json({
        success: true,
        queued: true,
        jobId: job.id,
        message: "Comentario enviado para ser publicado por tu cuenta personal de Facebook...",
        mode: 'cloud_queue'
      });
    }
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// SETTINGS & AI
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      settings,
      supportedModels: SUPPORTED_AI_MODELS
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const saved = await saveSettings(req.body);
    res.json({ success: true, settings: saved });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/ai/test', async (req, res) => {
  try {
    const settings = await getSettings();
    const apiKey = req.body?.apiKey || settings.openrouter_api_key;
    const model = req.body?.model || settings.openrouter_model || "deepseek/deepseek-chat";
    const result = await testOpenRouterKey(apiKey, model);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/ai/regenerate', async (req, res) => {
  try {
    const { authorName, postText, campaignId } = req.body;
    const campaigns = await getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId) || campaigns[0];
    const generated = await generateAiReply({ authorName, postText, campaign });
    res.json({ success: true, ...generated });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Initialize DB and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Plataforma 'Recomendaciones AI' Activa`);
    console.log(`🌐 Dashboard Local: http://localhost:${PORT}`);
    console.log(`☁️  URL en Coolify:  https://recomendaciones.agrolara.dedyn.io`);
    console.log(`====================================================`);
  });
}).catch(err => {
  console.error("Error iniciando base de datos:", err);
});

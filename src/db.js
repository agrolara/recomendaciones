import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { DEFAULT_CAMPAIGNS } from './defaultCampaigns.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const INITIAL_GROUPS = [
  { id: "269357883401410", name: "QUILICURA VENDE y COMPRA de todo ..", zone: "Quilicura", url: "https://www.facebook.com/groups/269357883401410/", is_active: true },
  { id: "vallelocampino", name: "Comunidad Valle Lo Campino", zone: "Valle Lo Campino", url: "https://www.facebook.com/groups/vallelocampino/", is_active: true },
  { id: "alseviciodelvallelocampino", name: "Al servicio del Valle lo campino", zone: "Valle Lo Campino", url: "https://www.facebook.com/groups/alseviciodelvallelocampino/", is_active: true },
  { id: "1764927573794266", name: "Valle Lo Campino Compra/Venta", zone: "Valle Lo Campino", url: "https://www.facebook.com/groups/1764927573794266/", is_active: true },
  { id: "blc_vecinos", name: "Barrio Lo Campino (BLC) Vecinos", zone: "Valle Lo Campino", url: "https://www.facebook.com/groups/1676325915979864/", is_active: true },
  { id: "vallegrande_comunidad", name: "Valle Grande Comunidad & Datos", zone: "Valle Grande", url: "https://www.facebook.com/groups/908920963227488/", is_active: true },
  { id: "1500359430196049", name: "Ventas y Datos Quilicura 🤝", zone: "Quilicura", url: "https://www.facebook.com/groups/1500359430196049/", is_active: true },
  { id: "168112446661481", name: "Somos Quilicura!", zone: "Quilicura", url: "https://www.facebook.com/groups/168112446661481/", is_active: true },
  { id: "538321249700932", name: "Comunidad Quilicura", zone: "Quilicura", url: "https://www.facebook.com/groups/538321249700932/", is_active: true },
  { id: "836831143158130", name: "Quilicura vende Delivery", zone: "Quilicura", url: "https://www.facebook.com/groups/836831143158130/", is_active: true },
  { id: "246269595753358", name: "Solo Delivery Quilicura", zone: "Quilicura", url: "https://www.facebook.com/groups/246269595753358/", is_active: true },
  { id: "1441002372618069", name: "Quilicura - Conchali - Independencia delivery 24/7", zone: "Quilicura", url: "https://www.facebook.com/groups/1441002372618069/", is_active: true },
  { id: "476939909747244", name: "Quilicura vende de todo !!!!", zone: "Quilicura", url: "https://www.facebook.com/groups/476939909747244/", is_active: true },
  { id: "marcelabrunet", name: "QUILICURA VENTAS SOLO ENTREGAS", zone: "Quilicura", url: "https://www.facebook.com/groups/marcelabrunet/", is_active: true }
];

const INITIAL_SETTINGS = {
  openrouter_api_key: process.env.OPENROUTER_API_KEY || "",
  openrouter_model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat",
  time_window_margin_minutes: 150,
  auto_scan_interval_minutes: 15,
  local_agent_url: process.env.LOCAL_AGENT_URL || "http://localhost:19825"
};

let pgPool = null;

// Initialize Postgres pool if DATABASE_URL is set
if (process.env.DATABASE_URL) {
  try {
    pgPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000
    });
    console.log("[DB] Conexión configurada con PostgreSQL / Supabase");
  } catch (err) {
    console.warn("[DB] No se pudo inicializar pool de Postgres, usando JSON storage fallback:", err.message);
  }
}

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load local database
function readLocalDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      campaigns: DEFAULT_CAMPAIGNS,
      groups: INITIAL_GROUPS,
      leads: [
        {
          id: "real_28807913132126474",
          campaign_id: "camp_radiotaxi",
          post_id: "28807913132126474",
          author: "Angui Lls",
          group_name: "Comunidad Valle Lo Campino",
          zone: "Valle Lo Campino",
          post_direct_url: "https://www.facebook.com/groups/vallelocampino/posts/28807913132126474/",
          content: "Algún taxi que trabaje ahora porfitas",
          exact_time: "Hace 2 h 10 min",
          age_seconds: 7800,
          age_minutes: 130,
          is_recent_2h: true,
          is_recent_4h: true,
          generated_reply: "Hola Angui! Te recomiendo a @radiotaxi fullexpress. Ellos hacen traslados de personas, delivery de cosas y transporte de encomiendas las 24 horas. Son súper puntuales y confiables, este es su número: +56 9 3024 7992.",
          ai_model_used: "template_deterministic",
          status: "pending",
          created_at: new Date().toISOString()
        }
      ],
      settings: INITIAL_SETTINGS
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error("[DB] Error leyendo JSON local, regenerando:", e.message);
    return {
      campaigns: DEFAULT_CAMPAIGNS,
      groups: INITIAL_GROUPS,
      leads: [],
      settings: INITIAL_SETTINGS
    };
  }
}

function writeLocalDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error("[DB] Error escribiendo a JSON local:", e.message);
  }
}

export async function initDatabase() {
  if (pgPool) {
    try {
      const client = await pgPool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS rec_campaigns (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            category VARCHAR(100),
            icon VARCHAR(10),
            brand_name VARCHAR(255),
            brand_tag VARCHAR(100),
            phone VARCHAR(50),
            keywords JSONB,
            negative_keywords JSONB,
            highlights TEXT,
            restrictions TEXT,
            template_reply TEXT,
            prompt_instructions TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS rec_groups (
            id VARCHAR(100) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            zone VARCHAR(100),
            url TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS rec_leads (
            id VARCHAR(100) PRIMARY KEY,
            campaign_id VARCHAR(100),
            post_id VARCHAR(100) NOT NULL,
            author VARCHAR(255),
            group_name VARCHAR(255),
            zone VARCHAR(100),
            post_direct_url TEXT NOT NULL,
            content TEXT,
            exact_time VARCHAR(100),
            age_seconds INTEGER,
            age_minutes INTEGER,
            is_recent_2h BOOLEAN DEFAULT FALSE,
            is_recent_4h BOOLEAN DEFAULT FALSE,
            generated_reply TEXT,
            ai_model_used VARCHAR(100),
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS rec_settings (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT
          );
        `);
        console.log("[DB] Tablas de PostgreSQL/Supabase listas.");
      } finally {
        client.release();
      }
    } catch (e) {
      console.warn("[DB] Error en migraciones PostgreSQL, operando con JSON storage:", e.message);
    }
  }

  // Ensure local DB is ready
  readLocalDb();
}

export async function getCampaigns() {
  const db = readLocalDb();
  return db.campaigns || [];
}

export async function saveCampaign(campaign) {
  const db = readLocalDb();
  if (!campaign.id) {
    campaign.id = 'camp_' + Date.now();
  }
  const idx = db.campaigns.findIndex(c => c.id === campaign.id);
  if (idx >= 0) {
    db.campaigns[idx] = { ...db.campaigns[idx], ...campaign };
  } else {
    db.campaigns.push(campaign);
  }
  writeLocalDb(db);
  return campaign;
}

export async function deleteCampaign(id) {
  const db = readLocalDb();
  db.campaigns = db.campaigns.filter(c => c.id !== id);
  writeLocalDb(db);
  return true;
}

export async function getGroups() {
  const db = readLocalDb();
  return db.groups || [];
}

export async function addGroup(group) {
  const db = readLocalDb();
  const existing = db.groups.find(g => g.id === group.id);
  if (existing) {
    return existing;
  }
  db.groups.unshift(group);
  writeLocalDb(db);
  return group;
}

export async function deleteGroup(id) {
  const db = readLocalDb();
  db.groups = db.groups.filter(g => g.id !== id);
  writeLocalDb(db);
  return true;
}

export async function updateGroupWatermark(id, { last_scanned_time, last_scanned_post_id }) {
  const db = readLocalDb();
  if (!db.groups) db.groups = [];
  const group = db.groups.find(g => g.id === id);
  if (group) {
    if (last_scanned_time) group.last_scanned_time = last_scanned_time;
    if (last_scanned_post_id) group.last_scanned_post_id = last_scanned_post_id;
    writeLocalDb(db);
  }
}

export async function cleanOldLeads(maxAgeHours = 24) {
  const db = readLocalDb();
  const cutoffSeconds = maxAgeHours * 3600;
  if (Array.isArray(db.leads)) {
    db.leads = db.leads.filter(l => (l.age_seconds ?? 0) <= cutoffSeconds);
    writeLocalDb(db);
  }
}

export async function getLeads() {
  const db = readLocalDb();
  const leads = db.leads || [];
  // Sort from least elapsed time to most elapsed time (más recientes primero)
  leads.sort((a, b) => (a.age_seconds ?? 999999) - (b.age_seconds ?? 999999));
  return leads;
}

export async function saveLead(lead) {
  const db = readLocalDb();
  const idx = db.leads.findIndex(l => l.post_id === lead.post_id);
  if (idx >= 0) {
    db.leads[idx] = { ...db.leads[idx], ...lead };
  } else {
    db.leads.unshift(lead);
  }
  // Re-sort
  db.leads.sort((a, b) => (a.age_seconds ?? 999999) - (b.age_seconds ?? 999999));
  writeLocalDb(db);
  return lead;
}

export async function updateLeadStatus(id, status) {
  const db = readLocalDb();
  const lead = db.leads.find(l => l.id === id || l.post_id === id);
  if (lead) {
    lead.status = status;
    writeLocalDb(db);
    return lead;
  }
  return null;
}

export async function getSettings() {
  const db = readLocalDb();
  return db.settings || INITIAL_SETTINGS;
}

export async function saveSettings(newSettings) {
  const db = readLocalDb();
  db.settings = { ...db.settings, ...newSettings };
  writeLocalDb(db);
  return db.settings;
}

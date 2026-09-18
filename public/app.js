let leads = [];
let campaigns = [];
let groups = [];
let settings = {};
let currentTimeFilter = 'all';
let currentCampaignFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  await loadAllData();
});

async function loadAllData() {
  await Promise.all([
    fetchLeads(),
    fetchCampaigns(),
    fetchGroups(),
    fetchSettings()
  ]);
  renderAll();
}

async function fetchLeads() {
  try {
    const res = await fetch('/api/leads');
    leads = await res.json();
  } catch(e) { console.error("Error cargando leads:", e); }
}

async function fetchCampaigns() {
  try {
    const res = await fetch('/api/campaigns');
    campaigns = await res.json();
  } catch(e) { console.error("Error cargando campañas:", e); }
}

async function fetchGroups() {
  try {
    const res = await fetch('/api/groups');
    groups = await res.json();
  } catch(e) { console.error("Error cargando grupos:", e); }
}

async function fetchSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    settings = data.settings || {};
    if (settings.openrouter_api_key) {
      document.getElementById('input-openrouter-key').value = settings.openrouter_api_key;
    }
    if (settings.openrouter_model) {
      document.getElementById('select-ai-model').value = settings.openrouter_model;
      const badge = document.getElementById('active-model-badge');
      if (badge) badge.innerText = `🤖 ${settings.openrouter_model.split('/')[1] || settings.openrouter_model}`;
    }
  } catch(e) { console.error("Error cargando configuración:", e); }
}

function renderAll() {
  renderLeads();
  renderCampaigns();
  renderGroups();
  populateCampaignFilter();
  updateCounters();
}

function switchTab(tabId) {
  const tabs = ['leads', 'campaigns', 'groups', 'settings'];
  tabs.forEach(t => {
    const content = document.getElementById(`tab-content-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (content) content.classList.toggle('hidden', t !== tabId);
    if (btn) {
      if (t === tabId) {
        btn.className = "px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/40";
      } else {
        btn.className = "px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-800";
      }
    }
  });
}

function updateCounters() {
  const elTabLeads = document.getElementById('tab-counter-leads');
  const elTabCamps = document.getElementById('tab-counter-campaigns');
  const elTabGroups = document.getElementById('tab-counter-groups');

  if (elTabLeads) elTabLeads.innerText = leads.filter(l => l.status === 'pending').length;
  if (elTabCamps) elTabCamps.innerText = campaigns.length;
  if (elTabGroups) elTabGroups.innerText = groups.length;

  const countAll = leads.length;
  const count2h = leads.filter(l => l.is_recent_2h || (l.age_minutes != null && l.age_minutes <= 150)).length;
  const count4h = leads.filter(l => l.is_recent_4h || (l.age_minutes != null && l.age_minutes <= 240)).length;

  const elAll = document.getElementById('count-all');
  const el2h = document.getElementById('count-2h');
  const el4h = document.getElementById('count-4h');

  if (elAll) elAll.innerText = countAll;
  if (el2h) el2h.innerText = count2h;
  if (el4h) el4h.innerText = count4h;
}

function setTimeFilter(filter) {
  currentTimeFilter = filter;
  const btnAll = document.getElementById('filter-btn-all');
  const btn2h = document.getElementById('filter-btn-2h');
  const btn4h = document.getElementById('filter-btn-4h');

  if (btnAll) btnAll.className = "px-2.5 py-1 rounded-lg font-bold border transition " + (filter === 'all' ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-slate-800 text-slate-300 border-slate-700 hover:text-amber-300");
  if (btn2h) btn2h.className = "px-2.5 py-1 rounded-lg font-bold border transition " + (filter === '2h' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-slate-800 text-slate-300 border-slate-700 hover:text-emerald-300");
  if (btn4h) btn4h.className = "px-2.5 py-1 rounded-lg font-bold border transition " + (filter === '4h' ? "bg-blue-500/20 text-blue-300 border-blue-500/40" : "bg-slate-800 text-slate-300 border-slate-700 hover:text-blue-300");

  renderLeads();
}

function populateCampaignFilter() {
  const select = document.getElementById('filter-campaign-select');
  if (!select) return;
  const curr = select.value;
  select.innerHTML = '<option value="all">Todas las Campañas</option>';
  campaigns.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.innerText = `${c.icon || '🏷️'} ${c.name}`;
    select.appendChild(opt);
  });
  if (curr) select.value = curr;
}

function applyFilters() {
  const select = document.getElementById('filter-campaign-select');
  if (select) currentCampaignFilter = select.value;
  renderLeads();
}

// ----------------------------------------------------
// TAB 1: RENDER LEADS
// ----------------------------------------------------
function renderLeads() {
  const container = document.getElementById('leads-container');
  if (!container) return;
  container.innerHTML = '';

  let filtered = [...leads];

  // Time filter
  if (currentTimeFilter === '2h') {
    filtered = filtered.filter(l => l.is_recent_2h || (l.age_minutes != null && l.age_minutes <= 150));
  } else if (currentTimeFilter === '4h') {
    filtered = filtered.filter(l => l.is_recent_4h || (l.age_minutes != null && l.age_minutes <= 240));
  }

  // Campaign filter
  if (currentCampaignFilter !== 'all') {
    filtered = filtered.filter(l => l.campaign_id === currentCampaignFilter);
  }

  // Strict sorting: least elapsed time to most elapsed time (más recientes primero)
  filtered.sort((a, b) => (a.age_seconds ?? 999999) - (b.age_seconds ?? 999999));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="glass-card p-8 rounded-2xl text-center space-y-2 border-dashed border-slate-700">
        <span class="text-3xl">📡</span>
        <h3 class="text-sm font-bold text-slate-300">No hay solicitudes en este filtro</h3>
        <p class="text-xs text-slate-500">Pulsa "Escanear Grupos Ahora" para buscar nuevas solicitudes en los grupos de Facebook.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(lead => {
    const is2h = lead.is_recent_2h || (lead.age_minutes != null && lead.age_minutes <= 150);
    const isCommented = lead.status === 'commented';

    const card = document.createElement('div');
    card.id = `card-${lead.post_id}`;
    card.className = `glass-card p-4 md:p-5 rounded-2xl space-y-3.5 transition border ${
      is2h ? 'border-emerald-500/40 bg-[#0c182c]/80' : 'border-slate-800'
    } ${isCommented ? 'opacity-60 bg-slate-900/40' : ''}`;

    card.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-amber-300 font-bold text-xs shadow">
            ${lead.authorAvatar || lead.author?.slice(0, 2).toUpperCase() || 'VC'}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-white">${lead.author || 'Vecino'}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-400 border border-slate-700">
                ${lead.zone || 'Comunidad'}
              </span>
            </div>
            <p class="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <i class="fa-brands fa-facebook text-blue-400 text-xs"></i>
              <span>${lead.group_name}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap sm:justify-end">
          <span class="px-2.5 py-1 rounded-lg text-xs font-bold border ${
            is2h
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 flex items-center gap-1.5'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }">
            ${is2h ? '<span class="w-2 h-2 rounded-full bg-emerald-400 radar-pulse"></span> ⚡' : '🕒'}
            ${lead.exact_time || 'Reciente'}
            ${is2h ? ' · MARCAR PRESENCIA' : ''}
          </span>

          <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <span>${lead.campaign_icon || '🏷️'}</span>
            <span>${lead.campaign_name || 'Campaña'}</span>
          </span>
        </div>
      </div>

      <!-- ORIGINAL POST TEXT -->
      <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-200">
        <p class="italic">"${lead.content}"</p>
      </div>

      <!-- AI GENERATED REPLY BOX -->
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-bold text-amber-300 flex items-center gap-1">
            <i class="fa-solid fa-sparkles text-amber-400"></i>
            <span>Recomendación Dinámica en 3ra Persona:</span>
          </span>
          <span class="text-[10px] font-mono text-slate-400">
            ${lead.ai_model_used ? `IA: ${lead.ai_model_used.split('/')[1] || lead.ai_model_used}` : 'Plantilla'}
          </span>
        </div>
        <textarea id="reply-text-${lead.post_id}" rows="2" class="w-full bg-[#0a1224] border border-amber-500/30 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 leading-relaxed font-sans">${lead.generated_reply || ''}</textarea>
      </div>

      <!-- ACTIONS -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        <div class="flex items-center gap-2">
          <a href="${lead.post_direct_url}" target="_blank" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            <span>Abrir Post Directo</span>
          </a>
          <button onclick="regenerateReply('${lead.post_id}', '${lead.campaign_id}')" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-arrows-rotate text-[10px]"></i>
            <span>Regenerar con IA</span>
          </button>
        </div>

        <div class="flex items-center gap-2">
          ${
            isCommented
              ? `<span class="px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5">
                  <i class="fa-solid fa-check"></i> Recomendación Publicada
                 </span>`
              : `<button id="btn-pub-${lead.post_id}" onclick="publishLead('${lead.post_id}', '${lead.post_direct_url}')" class="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 transform active:scale-95">
                  <i class="fa-solid fa-paper-plane"></i>
                  <span>Publicar con Facebook Personal</span>
                 </button>`
          }
          <button onclick="dismissLead('${lead.post_id}')" class="p-2 text-slate-500 hover:text-rose-400 text-xs rounded-lg transition" title="Descartar">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

// ----------------------------------------------------
// TAB 2: RENDER CAMPAIGNS
// ----------------------------------------------------
function renderCampaigns() {
  const grid = document.getElementById('campaigns-grid');
  if (!grid) return;
  grid.innerHTML = '';

  campaigns.forEach(c => {
    const card = document.createElement('div');
    card.className = "glass-card p-5 rounded-2xl space-y-3.5 border border-slate-800";
    card.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl shadow">
            ${c.icon || '🏷️'}
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">${c.name}</h3>
            <span class="text-[11px] text-amber-400 font-mono">${c.brand_tag || c.brand_name}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <button onclick="editCampaign('${c.id}')" class="p-2 text-slate-400 hover:text-amber-300 text-xs rounded-lg hover:bg-slate-800 transition" title="Editar">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deleteCampaignConfirm('${c.id}')" class="p-2 text-slate-400 hover:text-rose-400 text-xs rounded-lg hover:bg-slate-800 transition" title="Eliminar">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>

      <div class="space-y-1.5 text-xs text-slate-300">
        <p><strong class="text-slate-400">Teléfono / WhatsApp:</strong> <span class="font-mono text-amber-300">${c.phone || 'N/A'}</span></p>
        <p><strong class="text-slate-400">Especialidad:</strong> ${c.highlights || 'Servicios'}</p>
        ${c.restrictions ? `<p class="text-rose-300"><strong class="text-rose-400">Restricción:</strong> ${c.restrictions}</p>` : ''}
      </div>

      <!-- KEYWORDS PILLS -->
      <div class="space-y-1">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Palabras Clave:</span>
        <div class="flex flex-wrap gap-1">
          ${(c.keywords || []).slice(0, 7).map(k => `<span class="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono">${k}</span>`).join('')}
          ${(c.keywords || []).length > 7 ? `<span class="text-[10px] text-slate-500 font-mono">+${(c.keywords || []).length - 7} más</span>` : ''}
        </div>
      </div>

      <!-- TEMPLATE PREVIEW -->
      <div class="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 text-[11px] text-slate-400 italic">
        "${c.template_reply || ''}"
      </div>
    `;
    grid.appendChild(card);
  });
}

// ----------------------------------------------------
// TAB 3: RENDER GROUPS
// ----------------------------------------------------
function renderGroups() {
  const list = document.getElementById('groups-list');
  if (!list) return;
  list.innerHTML = '';

  groups.forEach(g => {
    const card = document.createElement('div');
    card.className = "glass-card p-3.5 rounded-xl flex items-center justify-between gap-3 border border-slate-800";
    card.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0">
        <i class="fa-brands fa-facebook text-blue-400 text-lg flex-shrink-0"></i>
        <div class="min-w-0">
          <h4 class="text-xs font-bold text-white truncate">${g.name}</h4>
          <p class="text-[10px] text-slate-400 font-mono">${g.zone || 'Grupo'}</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <a href="${g.url}" target="_blank" class="p-1.5 text-slate-400 hover:text-white text-xs" title="Visitar Grupo">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
        <button onclick="deleteGroupConfirm('${g.id}')" class="p-1.5 text-slate-500 hover:text-rose-400 text-xs" title="Eliminar">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    list.appendChild(card);
  });
}

// ----------------------------------------------------
// ACTIONS: SCANNING & PUBLISHING
// ----------------------------------------------------
async function triggerScan() {
  const btn = document.getElementById('btn-scan');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i><span>Escaneando Solicitudes...</span>';

  try {
    const res = await fetch('/api/scan', { method: 'POST' });
    const data = await res.json();
    await fetchLeads();
    renderLeads();
    updateCounters();
    alert(`¡Escaneo finalizado exitosamente! 🎉\n\nSe detectaron y actualizaron las solicitudes de los grupos.`);
  } catch(e) {
    alert("Error al escanear: " + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i><span>Escanear Grupos Ahora</span>';
  }
}

async function publishLead(postId, postDirectUrl) {
  const textarea = document.getElementById(`reply-text-${postId}`);
  const commentText = textarea ? textarea.value.trim() : '';

  if (!commentText) {
    alert("Por favor escribe o genera el comentario antes de publicar.");
    return;
  }

  const btn = document.getElementById(`btn-pub-${postId}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Publicando...';
  }

  try {
    const res = await fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, postDirectUrl, commentText })
    });
    const data = await res.json();

    if (data.success) {
      alert(`¡Comentario publicado exitosamente en Facebook! 🎉\n\nTu perfil personal recomendó el servicio en la publicación directa.`);
      await fetchLeads();
      renderLeads();
      updateCounters();
    } else {
      alert("Aviso de Seguridad: " + (data.error || 'No se pudo publicar'));
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>Reintentar Publicación</span>';
      }
    }
  } catch(e) {
    alert("Error de conexión: " + e.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>Reintentar Publicación</span>';
    }
  }
}

async function regenerateReply(postId, campaignId) {
  const lead = leads.find(l => l.post_id === postId);
  if (!lead) return;

  const textarea = document.getElementById(`reply-text-${postId}`);
  if (textarea) textarea.value = "Generando recomendación con IA...";

  try {
    const res = await fetch('/api/ai/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorName: lead.author,
        postText: lead.content,
        campaignId: campaignId
      })
    });
    const data = await res.json();
    if (data.success && textarea) {
      textarea.value = data.reply;
      lead.generated_reply = data.reply;
      lead.ai_model_used = data.modelUsed;
    }
  } catch(e) {
    alert("Error regenerando: " + e.message);
  }
}

async function dismissLead(postId) {
  if (!confirm("¿Deseas descartar esta solicitud de la lista?")) return;
  try {
    await fetch('/api/leads/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: postId, status: 'dismissed' })
    });
    leads = leads.filter(l => l.post_id !== postId);
    renderLeads();
    updateCounters();
  } catch(e) { alert("Error: " + e.message); }
}

// ----------------------------------------------------
// ACTIONS: CAMPAIGN MODAL
// ----------------------------------------------------
function openNewCampaignModal() {
  document.getElementById('modal-campaign-title').innerHTML = '<span>✨</span> Nueva Campaña de Servicio / Cliente';
  document.getElementById('camp-id').value = '';
  document.getElementById('camp-name').value = '';
  document.getElementById('camp-category').value = '';
  document.getElementById('camp-brand-tag').value = '';
  document.getElementById('camp-phone').value = '';
  document.getElementById('camp-keywords').value = '';
  document.getElementById('camp-negative-keywords').value = '';
  document.getElementById('camp-highlights').value = '';
  document.getElementById('camp-restrictions').value = '';
  document.getElementById('camp-template').value = 'Hola {nombre}! Te recomiendo a {marca}. Tienen excelente servicio, contáctalos al {telefono}.';
  document.getElementById('modal-campaign').classList.remove('hidden');
}

function editCampaign(id) {
  const c = campaigns.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modal-campaign-title').innerHTML = '<span>✏️</span> Editar Campaña: ' + c.name;
  document.getElementById('camp-id').value = c.id;
  document.getElementById('camp-name').value = c.name || '';
  document.getElementById('camp-category').value = c.category || '';
  document.getElementById('camp-brand-tag').value = c.brand_tag || '';
  document.getElementById('camp-phone').value = c.phone || '';
  document.getElementById('camp-keywords').value = (c.keywords || []).join(', ');
  document.getElementById('camp-negative-keywords').value = (c.negative_keywords || []).join(', ');
  document.getElementById('camp-highlights').value = c.highlights || '';
  document.getElementById('camp-restrictions').value = c.restrictions || '';
  document.getElementById('camp-template').value = c.template_reply || '';
  document.getElementById('modal-campaign').classList.remove('hidden');
}

function closeCampaignModal() {
  document.getElementById('modal-campaign').classList.add('hidden');
}

async function saveCampaignModal() {
  const id = document.getElementById('camp-id').value;
  const name = document.getElementById('camp-name').value.trim();
  if (!name) { alert("El nombre de la campaña es obligatorio."); return; }

  const keywordsStr = document.getElementById('camp-keywords').value;
  const negKeywordsStr = document.getElementById('camp-negative-keywords').value;

  const campaignData = {
    id: id || ('camp_' + Date.now()),
    name: name,
    category: document.getElementById('camp-category').value.trim(),
    brand_tag: document.getElementById('camp-brand-tag').value.trim(),
    brand_name: name,
    phone: document.getElementById('camp-phone').value.trim(),
    keywords: keywordsStr.split(',').map(s => s.trim()).filter(Boolean),
    negative_keywords: negKeywordsStr.split(',').map(s => s.trim()).filter(Boolean),
    highlights: document.getElementById('camp-highlights').value.trim(),
    restrictions: document.getElementById('camp-restrictions').value.trim(),
    template_reply: document.getElementById('camp-template').value.trim(),
    is_active: true
  };

  try {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignData)
    });
    const data = await res.json();
    if (data.success) {
      closeCampaignModal();
      await fetchCampaigns();
      renderCampaigns();
      populateCampaignFilter();
      updateCounters();
      alert("¡Campaña guardada con éxito! 🎉");
    }
  } catch(e) { alert("Error guardando campaña: " + e.message); }
}

async function deleteCampaignConfirm(id) {
  if (!confirm("¿Seguro que deseas eliminar esta campaña?")) return;
  try {
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    await fetchCampaigns();
    renderCampaigns();
    populateCampaignFilter();
    updateCounters();
  } catch(e) { alert("Error eliminando: " + e.message); }
}

// ----------------------------------------------------
// ACTIONS: GROUPS
// ----------------------------------------------------
async function addManualGroup() {
  const input = document.getElementById('input-new-group');
  const val = input.value.trim();
  if (!val) { alert("Pega el enlace de un grupo de Facebook."); return; }

  try {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urlOrId: val })
    });
    const data = await res.json();
    if (data.success) {
      input.value = '';
      await fetchGroups();
      renderGroups();
      updateCounters();
      alert("¡Grupo añadido al monitoreo exitosamente! 🎉");
    }
  } catch(e) { alert("Error: " + e.message); }
}

async function deleteGroupConfirm(id) {
  if (!confirm("¿Deseas dejar de monitorear este grupo?")) return;
  try {
    await fetch(`/api/groups/${id}`, { method: 'DELETE' });
    await fetchGroups();
    renderGroups();
    updateCounters();
  } catch(e) { alert("Error eliminando grupo: " + e.message); }
}

// ----------------------------------------------------
// ACTIONS: SETTINGS & OPENROUTER
// ----------------------------------------------------
function togglePasswordVisibility(id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

async function testAiConnection() {
  const apiKey = document.getElementById('input-openrouter-key').value.trim();
  const model = document.getElementById('select-ai-model').value;
  const resultSpan = document.getElementById('test-ai-result');

  if (!apiKey) {
    resultSpan.className = "text-[11px] text-amber-400 font-bold";
    resultSpan.innerText = "⚠️ Por favor escribe tu OpenRouter API Key antes de probar.";
    return;
  }

  resultSpan.className = "text-[11px] text-blue-400";
  resultSpan.innerText = "⏳ Conectando con OpenRouter...";

  try {
    const res = await fetch('/api/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, model })
    });
    const data = await res.json();
    if (data.success) {
      resultSpan.className = "text-[11px] text-emerald-400 font-bold";
      resultSpan.innerText = `✅ ¡Conexión exitosa! Modelo respondió: "${data.message}"`;
    } else {
      resultSpan.className = "text-[11px] text-rose-400 font-bold";
      resultSpan.innerText = `❌ Error: ${data.error}`;
    }
  } catch(e) {
    resultSpan.className = "text-[11px] text-rose-400 font-bold";
    resultSpan.innerText = `❌ Error de red: ${e.message}`;
  }
}

async function saveAiSettings() {
  const apiKey = document.getElementById('input-openrouter-key').value.trim();
  const model = document.getElementById('select-ai-model').value;

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openrouter_api_key: apiKey,
        openrouter_model: model
      })
    });
    const data = await res.json();
    if (data.success) {
      const badge = document.getElementById('active-model-badge');
      if (badge) badge.innerText = `🤖 ${model.split('/')[1] || model}`;
      alert("¡Configuración de IA guardada con éxito! 🎉");
    }
  } catch(e) { alert("Error guardando ajustes: " + e.message); }
}

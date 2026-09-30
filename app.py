"""
=============================================================================
PROJEKT VLASTA — Production Web Portal & REST API Server (Self-Contained)
=============================================================================
"""

import os
import sys
import re
import json
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
if hasattr(sys.stderr, 'reconfigure'):
    try: sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

from flask import Flask, jsonify, request

# Path setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")
DB_FILE = os.path.join(BASE_DIR, "database", "data.json")

# =============================================================================
# EMBEDDED WEB FALLBACK ASSETS
# =============================================================================

EMBEDDED_INDEX_HTML = """<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VLASTA — Systematický Řídicí Portál v1.0</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="stylesheet" href="styles.css">
</head>
<body class="dark-theme">
  <div class="app-container">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo-icon"><i class="fa-solid fa-gem"></i></div>
        <div class="brand-text">
          <h2>VLASTA <span class="badge-vlasta">PRO</span></h2>
          <span class="subtext">Systematický Portál v1.0</span>
        </div>
      </div>
      <nav class="nav-menu">
        <button class="nav-item active" data-tab="dashboard" onclick="switchTab('dashboard')">
          <i class="fa-solid fa-gauge-high"></i><span>Hlavní Přehled</span>
        </button>
        <button class="nav-item" data-tab="items" onclick="switchTab('items')">
          <i class="fa-solid fa-list-check"></i><span>Evidované Položky</span>
        </button>
        <button class="nav-item" data-tab="codebooks" onclick="switchTab('codebooks')">
          <i class="fa-solid fa-book-bookmark"></i><span>Číselníky</span>
        </button>
        <button class="nav-item" data-tab="voice" onclick="switchTab('voice')">
          <i class="fa-solid fa-microphone-lines"></i><span>Hlasový Asistent AI</span>
        </button>
        <button class="nav-item" data-tab="analytics" onclick="switchTab('analytics')">
          <i class="fa-solid fa-chart-line"></i><span>Analytika &amp; Statistiky</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <div class="status-box"><span class="status-dot"></span><span>VLASTA Engine: <strong>Aktivní</strong></span></div>
      </div>
    </aside>
    <main class="main-content">
      <header class="top-header">
        <div class="header-left">
          <h1 id="page-title">Hlavní Přehled</h1>
          <p class="page-subtitle" id="page-subtitle">Přehledná správa a řízení projektu VLASTA</p>
        </div>
        <div class="header-actions">
          <div class="search-box">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="global-search" placeholder="Hledat v projektu Vlasta..." oninput="filterItems()">
          </div>
          <button class="btn-primary" onclick="loadVlastaData()"><i class="fa-solid fa-rotate-right"></i> Obnovit Data</button>
        </div>
      </header>

      <section class="tab-pane active" id="tab-dashboard">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon icon-cyan"><i class="fa-solid fa-cubes"></i></div>
            <div class="stat-details"><span class="stat-title">Celkem Položek</span><h3 id="stat-total-items">0</h3></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon icon-emerald"><i class="fa-solid fa-layer-group"></i></div>
            <div class="stat-details"><span class="stat-title">Celkové Množství</span><h3 id="stat-total-qty">0 ks</h3></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon icon-indigo"><i class="fa-solid fa-tags"></i></div>
            <div class="stat-details"><span class="stat-title">Kategorie</span><h3 id="stat-categories-count">0</h3></div>
          </div>
        </div>

        <div class="dashboard-grid margin-top-lg">
          <div class="grid-card col-span-2">
            <div class="card-header">
              <h3><i class="fa-solid fa-clock-rotate-left"></i> Poslední Přidané Záznamy</h3>
              <button class="btn-secondary btn-sm" onclick="switchTab('items')">Zobrazit Vše</button>
            </div>
            <div class="card-body">
              <div class="table-container">
                <table class="data-table">
                  <thead><tr><th>Kód</th><th>Název</th><th>Kategorie</th><th>Množství</th><th>Umovní / Sklad</th><th>Stav</th></tr></thead>
                  <tbody id="recent-items-body"></tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="grid-card">
            <div class="card-header"><h3><i class="fa-solid fa-chart-pie"></i> Rozpad Kategorií</h3></div>
            <div class="card-body"><canvas id="categoryChart" height="200"></canvas></div>
          </div>
        </div>
      </section>

      <section class="tab-pane" id="tab-items">
        <div class="grid-card">
          <div class="card-header">
            <h3><i class="fa-solid fa-boxes-stacked"></i> Evidované Položky v Projektu Vlasta</h3>
            <button class="btn-primary btn-sm" onclick="showAddItemModal()"><i class="fa-solid fa-plus"></i> Přidat Novou Položku</button>
          </div>
          <div class="card-body">
            <div class="table-container">
              <table class="data-table">
                <thead><tr><th>ID</th><th>Kód</th><th>Název Položky</th><th>Kategorie</th><th>Množství</th><th>Umístění</th><th>Exspirace / Datum</th><th>Stav</th></tr></thead>
                <tbody id="all-items-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section class="tab-pane" id="tab-codebooks">
        <div class="codebook-header-tabs margin-bottom-md">
          <button class="cb-tab-btn active" data-cb="technicians" onclick="switchCodebookTab('technicians')"><i class="fa-solid fa-user-gear"></i> Technici</button>
          <button class="cb-tab-btn" data-cb="hospitals" onclick="switchCodebookTab('hospitals')"><i class="fa-solid fa-hospital"></i> Nemocnice</button>
          <button class="cb-tab-btn" data-cb="material" onclick="switchCodebookTab('material')"><i class="fa-solid fa-heart-pulse"></i> Materiál</button>
          <button class="cb-tab-btn" data-cb="accessories" onclick="switchCodebookTab('accessories')"><i class="fa-solid fa-plug-circle-bolt"></i> Příslušenství</button>
        </div>

        <div class="cb-pane active" id="cb-pane-technicians">
          <div class="grid-card">
            <div class="card-header"><h3><i class="fa-solid fa-user-gear"></i> Číselník Technických Specialistů</h3><button class="btn-primary btn-sm" onclick="showAddCodebookModal('technicians')"><i class="fa-solid fa-plus"></i> Přidat Technika</button></div>
            <div class="card-body"><div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Jméno a Příjmení</th><th>E-mail</th><th>Telefon</th><th>Region / Působnost</th><th>Stav</th></tr></thead><tbody id="cb-table-technicians"></tbody></table></div></div>
          </div>
        </div>

        <div class="cb-pane" id="cb-pane-hospitals">
          <div class="grid-card">
            <div class="card-header"><h3><i class="fa-solid fa-hospital"></i> Číselník Nemocnic a Kardiocenter</h3><button class="btn-primary btn-sm" onclick="showAddCodebookModal('hospitals')"><i class="fa-solid fa-plus"></i> Přidat Nemocnici</button></div>
            <div class="card-body"><div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Název Nemocnice</th><th>Město</th><th>Adresa</th><th>Preferovaná Značka</th><th>Stav Tendru</th></tr></thead><tbody id="cb-table-hospitals"></tbody></table></div></div>
          </div>
        </div>

        <div class="cb-pane" id="cb-pane-material">
          <div class="grid-card">
            <div class="card-header"><h3><i class="fa-solid fa-heart-pulse"></i> Číselník Implantabilního Materiálu (CRT/ICD/Pacemakery)</h3><button class="btn-primary btn-sm" onclick="showAddCodebookModal('material')"><i class="fa-solid fa-plus"></i> Přidat Materiál</button></div>
            <div class="card-body"><div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Kód</th><th>Název Materiálu</th><th>Kategorie</th><th>Dodavatel</th><th>Záruka (měs.)</th></tr></thead><tbody id="cb-table-material"></tbody></table></div></div>
          </div>
        </div>

        <div class="cb-pane" id="cb-pane-accessories">
          <div class="grid-card">
            <div class="card-header"><h3><i class="fa-solid fa-plug-circle-bolt"></i> Číselník Příslušenství (Elektrody, Katétry, Dráty)</h3><button class="btn-primary btn-sm" onclick="showAddCodebookModal('accessories')"><i class="fa-solid fa-plus"></i> Přidat Příslušenství</button></div>
            <div class="card-body"><div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Kód</th><th>Název Příslušenství</th><th>Kategorie</th><th>Kompatibilita</th><th>Min. Sklad</th></tr></thead><tbody id="cb-table-accessories"></tbody></table></div></div>
          </div>
        </div>
      </section>

      <section class="tab-pane" id="tab-voice">
        <div class="grid-card">
          <div class="card-header"><h3><i class="fa-solid fa-microphone text-positive"></i> Hlasový Asistent Vlasta AI</h3></div>
          <div class="card-body">
            <p>Zadejte příkaz hlasem (např. <em>„Přidej novou položku VLS-200, název Testovací Modul, kategorie A, množství 10 kusů.“</em>):</p>
            <div class="voice-controls margin-top-md">
              <button class="btn-primary btn-large" id="btn-vlasta-rec" onclick="toggleVlastaVoice()"><i class="fa-solid fa-microphone" id="vlasta-mic-icon"></i><span id="vlasta-mic-text">Stisknout a Mluvit</span></button>
              <span id="vlasta-voice-status" style="font-weight: 600; color: #94a3b8; margin-left: 15px;">Přípraveno</span>
            </div>
            <div class="form-group margin-top-md">
              <label for="vlasta-voice-input"><strong>Přepis hlasu / Textový příkaz:</strong></label>
              <textarea id="vlasta-voice-input" rows="3" class="select-input full-width margin-top-sm" placeholder="Text rozpoznaný hlasem..."></textarea>
            </div>
            <button class="btn-primary margin-top-sm" onclick="processVlastaVoiceCommand()"><i class="fa-solid fa-bolt"></i> Zpracovat Příkaz Vlasta AI</button>
          </div>
        </div>
      </section>

      <section class="tab-pane" id="tab-analytics">
        <div class="grid-card">
          <div class="card-header"><h3><i class="fa-solid fa-chart-line"></i> Systémová Analytika VLASTA</h3></div>
          <div class="card-body"><p>Systém VLASTA běží na dedikovaném REST API a čisté MCP vrstvě.</p></div>
        </div>
      </section>
    </main>
  </div>
  <script src="app.js"></script>
</body>
</html>
"""

EMBEDDED_STYLES_CSS = """
:root {
  --bg-dark: #0b0f19;
  --bg-card: #141c2e;
  --bg-card-hover: #1e293b;
  --border-color: #27354a;
  --accent-cyan: #06b6d4;
  --accent-emerald: #10b981;
  --accent-indigo: #6366f1;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --font-sans: 'Inter', -apple-system, sans-serif;
  --font-display: 'Outfit', -apple-system, sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-sans); background-color: var(--bg-dark); color: var(--text-main); min-height: 100vh; }
.app-container { display: flex; min-height: 100vh; }
.sidebar { width: 260px; background-color: #0d1322; border-right: 1px solid var(--border-color); display: flex; flex-direction: column; padding: 20px; }
.brand { display: flex; align-items: center; gap: 12px; margin-bottom: 30px; }
.logo-icon { width: 42px; height: 42px; background: linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo)); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #fff; }
.brand-text h2 { font-family: var(--font-display); font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
.badge-vlasta { font-size: 10px; background: var(--accent-cyan); color: #000; padding: 2px 6px; border-radius: 4px; font-weight: 800; }
.subtext { font-size: 12px; color: var(--text-muted); }
.nav-menu { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: transparent; border: none; color: var(--text-muted); font-size: 14px; font-weight: 500; border-radius: 8px; cursor: pointer; transition: all 0.2s ease; text-align: left; }
.nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text-main); }
.nav-item.active { background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(99, 102, 241, 0.15)); color: var(--accent-cyan); border-left: 3px solid var(--accent-cyan); }
.sidebar-footer { padding-top: 15px; border-top: 1px solid var(--border-color); font-size: 12px; color: var(--text-muted); }
.status-box { display: flex; align-items: center; gap: 8px; }
.status-dot { width: 8px; height: 8px; background: var(--accent-emerald); border-radius: 50%; }
.main-content { flex: 1; padding: 30px; overflow-y: auto; }
.top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
#page-title { font-family: var(--font-display); font-size: 26px; font-weight: 700; }
.page-subtitle { font-size: 14px; color: var(--text-muted); margin-top: 4px; }
.header-actions { display: flex; gap: 15px; }
.search-box { position: relative; width: 300px; }
.search-box i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-box input { width: 100%; padding: 10px 14px 10px 38px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-main); font-size: 14px; }
.btn-primary { background: linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo)); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: opacity 0.2s; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-main); padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.tab-pane { display: none; }
.tab-pane.active { display: block; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; }
.stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.icon-cyan { background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); }
.icon-emerald { background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); }
.icon-indigo { background: rgba(99, 102, 241, 0.15); color: var(--accent-indigo); }
.stat-title { font-size: 13px; color: var(--text-muted); }
.stat-details h3 { font-family: var(--font-display); font-size: 24px; font-weight: 700; margin-top: 2px; }
.dashboard-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.col-span-2 { grid-column: span 2; }
.margin-top-lg { margin-top: 25px; }
.margin-top-md { margin-top: 15px; }
.margin-top-sm { margin-top: 10px; }
.grid-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.card-header h3 { font-size: 16px; font-weight: 600; }
.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th, .data-table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--border-color); }
.data-table th { color: var(--text-muted); font-weight: 600; font-size: 12px; text-transform: uppercase; }
.select-input { background: var(--bg-dark); border: 1px solid var(--border-color); color: var(--text-main); padding: 10px; border-radius: 6px; }
.full-width { width: 100%; }
.codebook-header-tabs { display: flex; gap: 10px; margin-bottom: 20px; background: var(--bg-card); padding: 8px; border-radius: 10px; border: 1px solid var(--border-color); }
.cb-tab-btn { background: transparent; border: none; color: var(--text-muted); padding: 10px 20px; font-weight: 600; font-size: 14px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease; }
.cb-tab-btn:hover { background: rgba(255, 255, 255, 0.05); color: var(--text-main); }
.cb-tab-btn.active { background: linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo)); color: #fff; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.25); }
.cb-pane { display: none; }
.cb-pane.active { display: block; }
"""

EMBEDDED_APP_JS = """
window.switchTab = function(tabKey) {
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  const titlesMap = {
    dashboard: { title: 'Hlavní Přehled', subtitle: 'Přehledná správa a řízení projektu VLASTA' },
    items: { title: 'Evidované Položky', subtitle: 'Detailní seznam všech položek v databázi VLASTA' },
    codebooks: { title: 'Číselníky', subtitle: 'Správa kmenových dat: Technici, Nemocnice, Materiál, Příslušenství' },
    voice: { title: 'Hlasový Asistent Vlasta AI', subtitle: 'Zadávání a zpracování příkazů pomocí hlasového rozhraní' },
    analytics: { title: 'Analytika & Statistiky', subtitle: 'Systémový rozpad dat a přehledy aktivních kategorií' }
  };
  navItems.forEach(i => { if (i.getAttribute('data-tab') === tabKey) i.classList.add('active'); else i.classList.remove('active'); });
  tabPanes.forEach(pane => { if (pane.id === `tab-${tabKey}`) pane.classList.add('active'); else pane.classList.remove('active'); });
  if (titlesMap[tabKey] && pageTitle && pageSubtitle) { pageTitle.textContent = titlesMap[tabKey].title; pageSubtitle.textContent = titlesMap[tabKey].subtitle; }
  if (tabKey === 'codebooks') { loadVlastaCodebooks(); }
};

window.switchCodebookTab = function(cbKey) {
  const buttons = document.querySelectorAll('.cb-tab-btn');
  const panes = document.querySelectorAll('.cb-pane');
  buttons.forEach(btn => { if (btn.getAttribute('data-cb') === cbKey) btn.classList.add('active'); else btn.classList.remove('active'); });
  panes.forEach(pane => { if (pane.id === `cb-pane-${cbKey}`) pane.classList.add('active'); else pane.classList.remove('active'); });
};

let vlastaData = { items: [], codebooks: {} };

function loadVlastaData() {
  fetch('/api/vlasta/items').then(r => r.json()).then(data => { vlastaData.items = data.items || []; renderDashboardStats(); renderItemsTable(); }).catch(err => console.error(err));
}

function loadVlastaCodebooks() {
  fetch('/api/vlasta/codebooks').then(r => r.json()).then(data => {
    vlastaData.codebooks = data || {};
    renderTechniciansTable(data.technicians || []);
    renderHospitalsTable(data.hospitals || []);
    renderMaterialTable(data.material || []);
    renderAccessoriesTable(data.accessories || []);
  }).catch(err => console.error(err));
}

function renderTechniciansTable(items) {
  const tbody = document.getElementById('cb-table-technicians');
  if (!tbody) return;
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Žádní technici.</td></tr>'; return; }
  let html = '';
  items.forEach(t => { html += `<tr><td>#${t.id}</td><td><strong>${t.name}</strong></td><td>${t.email}</td><td>${t.phone}</td><td><span class="badge-vlasta">${t.region}</span></td><td><span style="color:#10b981;">● ${t.status || 'Aktivní'}</span></td></tr>`; });
  tbody.innerHTML = html;
}

function renderHospitalsTable(items) {
  const tbody = document.getElementById('cb-table-hospitals');
  if (!tbody) return;
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Žádné nemocnice.</td></tr>'; return; }
  let html = '';
  items.forEach(h => { html += `<tr><td>#${h.id}</td><td><strong>${h.name}</strong></td><td>${h.city}</td><td>${h.address}</td><td><span class="badge-vlasta">${h.preferred_brand}</span></td><td><span style="color:#10b981;">● ${h.tender_status}</span></td></tr>`; });
  tbody.innerHTML = html;
}

function renderMaterialTable(items) {
  const tbody = document.getElementById('cb-table-material');
  if (!tbody) return;
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Žádný materiál.</td></tr>'; return; }
  let html = '';
  items.forEach(m => { html += `<tr><td>#${m.id}</td><td><strong>${m.code}</strong></td><td>${m.name}</td><td><span class="badge-vlasta">${m.category}</span></td><td>${m.supplier}</td><td>${m.warranty_months} měs.</td></tr>`; });
  tbody.innerHTML = html;
}

function renderAccessoriesTable(items) {
  const tbody = document.getElementById('cb-table-accessories');
  if (!tbody) return;
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Žádné příslušenství.</td></tr>'; return; }
  let html = '';
  items.forEach(a => { html += `<tr><td>#${a.id}</td><td><strong>${a.code}</strong></td><td>${a.name}</td><td><span class="badge-vlasta">${a.category}</span></td><td>${a.compat}</td><td>${a.stock_min} ks</td></tr>`; });
  tbody.innerHTML = html;
}

function showAddCodebookModal(cbType) {
  const labels = { technicians: 'Technika', hospitals: 'Nemocnici', material: 'Materiál', accessories: 'Příslušenství' };
  const val = prompt(`Přidat záznam do číselníku pro ${labels[cbType] || cbType}:\nZadejte hodnoty oddělené čárkou.`);
  if (!val) return;
  const parts = val.split(',').map(p => p.trim());
  let itemData = {};
  if (cbType === 'technicians') { itemData = { name: parts[0] || 'Nový Technik', email: parts[1] || 'technik@cardion.cz', phone: parts[2] || '+420 724 000 000', region: parts[3] || 'ČR', status: 'Aktivní' }; }
  else if (cbType === 'hospitals') { itemData = { name: parts[0] || 'Nová Nemocnice', city: parts[1] || 'Brno', address: parts[2] || 'Hlavní 1', preferred_brand: parts[3] || 'Gallant', tender_status: 'Aktivní' }; }
  else if (cbType === 'material') { itemData = { code: parts[0] || 'MAT-001', name: parts[1] || 'Nový Materiál', category: parts[2] || 'ICD', supplier: parts[3] || 'CARDION', warranty_months: 72 }; }
  else if (cbType === 'accessories') { itemData = { code: parts[0] || 'ACC-001', name: parts[1] || 'Nové Příslušenství', category: parts[2] || 'Elektrody', compat: parts[3] || 'Univerzální', stock_min: 10 }; }

  fetch('/api/vlasta/codebooks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: cbType, data: itemData }) })
  .then(r => r.json()).then(() => loadVlastaCodebooks());
}

function renderDashboardStats() {
  const items = vlastaData.items;
  document.getElementById('stat-total-items').textContent = items.length;
  document.getElementById('stat-total-qty').textContent = `${items.reduce((acc, i) => acc + (parseInt(i.quantity) || 0), 0)} ks`;
  const cats = {}; items.forEach(i => { const c = i.category || 'Ostatní'; cats[c] = (cats[c] || 0) + 1; });
  document.getElementById('stat-categories-count').textContent = Object.keys(cats).length;
  renderRecentTable(items.slice(0, 5));
  renderCategoryChart(cats);
}

function renderRecentTable(recentItems) {
  const tbody = document.getElementById('recent-items-body');
  if (!tbody) return;
  if (recentItems.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Žádné položky.</td></tr>'; return; }
  let html = '';
  recentItems.forEach(i => { html += `<tr><td><strong>${i.code}</strong></td><td>${i.name}</td><td><span class="badge-vlasta">${i.category}</span></td><td>${i.quantity} ks</td><td>${i.location}</td><td><span style="color:#10b981;">● ${i.status}</span></td></tr>`; });
  tbody.innerHTML = html;
}

function renderItemsTable() {
  const tbody = document.getElementById('all-items-body');
  if (!tbody) return;
  const items = vlastaData.items;
  if (items.length === 0) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Žádné položky k zobrazení.</td></tr>'; return; }
  let html = '';
  items.forEach(i => { html += `<tr><td>#${i.id}</td><td><strong>${i.code}</strong></td><td>${i.name}</td><td><span class="badge-vlasta">${i.category}</span></td><td>${i.quantity} ks</td><td>${i.location}</td><td>${i.expiry || '-'}</td><td><span style="color:#10b981;">● ${i.status}</span></td></tr>`; });
  tbody.innerHTML = html;
}

let catChart = null;
function renderCategoryChart(cats) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  if (catChart) catChart.destroy();
  catChart = new Chart(ctx, { type: 'doughnut', data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: ['#06b6d4', '#10b981', '#6366f1', '#f59e0b', '#ef4444'] }] }, options: { responsive: true, plugins: { legend: { labels: { color: '#94a3b8' } } } } });
}

function filterItems() {
  const q = document.getElementById('global-search').value.toLowerCase();
  renderRecentTable(vlastaData.items.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)).slice(0, 5));
}

let vlastaRec = null; let vlastaRecording = false;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  vlastaRec = new SR(); vlastaRec.lang = 'cs-CZ'; vlastaRec.continuous = true; vlastaRec.interimResults = true;
  vlastaRec.onresult = (e) => { let text = ''; for (let i = 0; i < e.results.length; i++) { text += e.results[i][0].transcript + ' '; } document.getElementById('vlasta-voice-input').value = text.trim(); };
  vlastaRec.onend = () => { if (vlastaRecording) { try { vlastaRec.start(); } catch(err){} return; } document.getElementById('vlasta-voice-status').textContent = '✅ Hlas zaznamenán!'; };
}

function toggleVlastaVoice() {
  if (!vlastaRec) { alert('Speech API není dostupné v tomto prohlížeči.'); return; }
  if (vlastaRecording) { vlastaRecording = false; vlastaRec.stop(); }
  else { vlastaRecording = true; vlastaRec.start(); document.getElementById('vlasta-voice-status').textContent = '🔴 Nahrávám příkaz pro Vlastu...'; }
}

function processVlastaVoiceCommand() {
  const txt = document.getElementById('vlasta-voice-input').value;
  if (!txt) return;
  fetch('/api/vlasta/parse-voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: txt }) })
  .then(r => r.json()).then(res => { alert(`VLASTA AI Zpracovala příkaz:\nKód: ${res.item.code}\nNázev: ${res.item.name}\nKategorie: ${res.item.category}\nMnožství: ${res.item.quantity} ks`); loadVlastaData(); });
}

document.addEventListener('DOMContentLoaded', () => { loadVlastaData(); loadVlastaCodebooks(); });
"""

# =============================================================================
# DATA STORAGE & TOOL FUNCTIONS
# =============================================================================

def load_db():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Chyba nacteni DB: {e}", flush=True)
    return {
        "items": [],
        "codebooks": {
            "technicians": [
                { "id": 1, "name": "Jaroslav Černý", "email": "jaroslav.cerny@cardion.cz", "phone": "+420 724 111 222", "region": "Jihomoravský kraj", "status": "Aktivní" },
                { "id": 2, "name": "Martin Selingr", "email": "martin.selingr@cardion.cz", "phone": "+420 724 528 085", "region": "Jihomoravský / Praha", "status": "Aktivní" },
                { "id": 3, "name": "Henio (Henryk Szymeczek)", "email": "henio@cardion.cz", "phone": "+420 724 333 444", "region": "Moravskoslezský kraj", "status": "Aktivní" },
                { "id": 4, "name": "Jakub Střítecký", "email": "jakub.stritecky@cardion.cz", "phone": "+420 724 555 666", "region": "Praha / Středočeský", "status": "Aktivní" }
            ],
            "hospitals": [
                { "id": 1, "name": "FN Brno Bohunice", "city": "Brno", "address": "Jihlavská 20, Brno", "preferred_brand": "Quadra Assura MP / Fortify Assura", "tender_status": "Schválený tender 2026" },
                { "id": 2, "name": "FN USA BRNO", "city": "Brno", "address": "Pekařská 53, Brno", "preferred_brand": "Gallant HF / DR / VR", "tender_status": "Schválený tender 2026" },
                { "id": 3, "name": "IKEM Praha", "city": "Praha", "address": "Vídeňská 1958/9, Praha 4", "preferred_brand": "Gallant / Fortify Assura", "tender_status": "Schválený tender 2026" },
                { "id": 4, "name": "FNsP Ostrava Poruba", "city": "Ostrava", "address": "17. listopadu 1790/5, Ostrava", "preferred_brand": "Gallant / Durata 7122", "tender_status": "Schválený tender 2026" }
            ],
            "material": [
                { "id": 1, "code": "PM3562", "name": "Quadra Allure MP™ CRT", "category": "CRT-D / ICD", "supplier": "CARDION s.r.o.", "warranty_months": 72 },
                { "id": 2, "code": "CDDRA500Q", "name": "Gallant DR CDDRA500Q", "category": "Dvoudutinový ICD (DR)", "supplier": "CARDION s.r.o.", "warranty_months": 72 },
                { "id": 3, "code": "CD1359-40QC", "name": "Fortify Assura VR CD1359-40QC", "category": "Jednodutinový ICD (VR)", "supplier": "CARDION s.r.o.", "warranty_months": 72 }
            ],
            "accessories": [
                { "id": 1, "code": "1458Q", "name": "Quartet™ 86 cm Elektroda", "category": "Elektrody", "compat": "Quadra Allure MP", "stock_min": 10 },
                { "id": 2, "code": "405120", "name": "Peel-Away Introducer 405120", "category": "Zaváděcí katétry", "compat": "Univerzální", "stock_min": 25 },
                { "id": 3, "code": "DS2C019", "name": "CPS Direct™ Universal DS2C019", "category": "Vodicí katétry", "compat": "Univerzální", "stock_min": 15 },
                { "id": 4, "code": "DS2G002", "name": "CPS COURIER™ Guidewire medium 195 cm", "category": "Vodicí dráty", "compat": "Univerzální", "stock_min": 30 }
            ]
        },
        "logs": []
    }

def save_db(db):
    try:
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Chyba ukladani DB: {e}", flush=True)

def tool_vlasta_hledat(query="", category="", limit=20, offset=0):
    db = load_db()
    items = db.get("items", [])
    filtered = items
    if query:
        q = query.lower()
        filtered = [i for i in filtered if q in i.get("name", "").lower() or q in i.get("code", "").lower()]
    if category:
        c = category.lower()
        filtered = [i for i in filtered if c in i.get("category", "").lower()]
    total = len(filtered)
    paged = filtered[offset:offset+limit]
    return {"total": total, "limit": limit, "offset": offset, "items": paged}

def tool_vlasta_detail(item_id=None, code=None):
    db = load_db()
    for item in db.get("items", []):
        if (item_id and item.get("id") == int(item_id)) or (code and item.get("code") == code):
            return {"found": True, "item": item}
    return {"found": False, "message": "Položka nenalezena"}

def tool_vlasta_pridat(code, name, category, quantity=1, location="Hlavní sklad", expiry=""):
    db = load_db()
    items = db.get("items", [])
    new_id = max([i.get("id", 0) for i in items] + [0]) + 1
    new_item = {
        "id": new_id,
        "code": code,
        "name": name,
        "category": category,
        "status": "Aktivní",
        "location": location,
        "quantity": int(quantity),
        "expiry": expiry or "2028-12-31",
        "created_at": datetime.now().isoformat()
    }
    items.insert(0, new_item)
    db["items"] = items
    db["logs"].append({"ts": datetime.now().isoformat(), "event": f"Pridana polozka {code} ({name})", "user": "System"})
    save_db(db)
    return {"ok": True, "item": new_item}

def tool_vlasta_statistiky():
    db = load_db()
    items = db.get("items", [])
    total_qty = sum([i.get("quantity", 0) for i in items])
    categories = {}
    for i in items:
        cat = i.get("category", "Ostatní")
        categories[cat] = categories.get(cat, 0) + 1
    return {"total_items": len(items), "total_quantity": total_qty, "categories_breakdown": categories, "last_updated": datetime.now().isoformat()}

def tool_vlasta_codebooks(cb_type=None, action="get", data=None):
    db = load_db()
    codebooks = db.get("codebooks", {
        "technicians": [],
        "hospitals": [],
        "material": [],
        "accessories": []
    })
    if action == "get":
        if cb_type and cb_type in codebooks:
            return {cb_type: codebooks[cb_type]}
        return codebooks
    if action == "add" and cb_type in codebooks and isinstance(data, dict):
        current_list = codebooks[cb_type]
        new_id = max([item.get("id", 0) for item in current_list] + [0]) + 1
        data["id"] = new_id
        current_list.append(data)
        db["codebooks"] = codebooks
        db["logs"].append({"ts": datetime.now().isoformat(), "event": f"Přidán záznam do číselníku {cb_type}: {data.get('name', 'Neznámý')}", "user": "System"})
        save_db(db)
        return {"ok": True, "item": data, "codebook": cb_type}
    return {"ok": False, "message": "Neplatný požadavek na číselník"}

# =============================================================================
# FLASK WEB SERVER APP
# =============================================================================

app = Flask(__name__)

@app.route('/')
def index():
    idx_path = os.path.join(WEB_DIR, 'index.html')
    if os.path.exists(idx_path):
        with open(idx_path, 'r', encoding='utf-8') as f:
            return f.read(), 200, {'Content-Type': 'text/html; charset=utf-8'}
    return EMBEDDED_INDEX_HTML, 200, {'Content-Type': 'text/html; charset=utf-8'}

@app.route('/styles.css')
def styles():
    css_path = os.path.join(WEB_DIR, 'styles.css')
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            return f.read(), 200, {'Content-Type': 'text/css; charset=utf-8'}
    return EMBEDDED_STYLES_CSS, 200, {'Content-Type': 'text/css; charset=utf-8'}

@app.route('/app.js')
def js():
    js_path = os.path.join(WEB_DIR, 'app.js')
    if os.path.exists(js_path):
        with open(js_path, 'r', encoding='utf-8') as f:
            return f.read(), 200, {'Content-Type': 'application/javascript; charset=utf-8'}
    return EMBEDDED_APP_JS, 200, {'Content-Type': 'application/javascript; charset=utf-8'}

@app.route('/api/vlasta/items', methods=['GET'])
def get_items():
    data = tool_vlasta_hledat(limit=100)
    return jsonify(data)

@app.route('/api/vlasta/stats', methods=['GET'])
def get_stats():
    data = tool_vlasta_statistiky()
    return jsonify(data)

@app.route('/api/vlasta/codebooks', methods=['GET'])
def get_codebooks():
    cb_type = request.args.get('type')
    data = tool_vlasta_codebooks(cb_type=cb_type, action="get")
    return jsonify(data)

@app.route('/api/vlasta/codebooks', methods=['POST'])
def add_codebook():
    req_json = request.get_json(force=True, silent=True) or {}
    cb_type = req_json.get('type')
    item_data = req_json.get('data', {})
    res = tool_vlasta_codebooks(cb_type=cb_type, action="add", data=item_data)
    return jsonify(res)

@app.route('/api/vlasta/items', methods=['POST'])
def add_item():
    req_json = request.get_json(force=True, silent=True) or {}
    res = tool_vlasta_pridat(
        code=req_json.get('code', f'VLS-{int(datetime.now().timestamp())}'),
        name=req_json.get('name', 'Nová Položka Vlasta'),
        category=req_json.get('category', 'Kategorie A'),
        quantity=req_json.get('quantity', 1),
        location=req_json.get('location', 'Hlavní sklad')
    )
    return jsonify(res)

@app.route('/api/vlasta/parse-voice', methods=['POST'])
def parse_voice():
    req_json = request.get_json(force=True, silent=True) or {}
    text = req_json.get('text', '')
    code_match = re.search(r'vls-\d+', text, re.IGNORECASE)
    code = code_match.group(0).upper() if code_match else f"VLS-{int(datetime.now().timestamp()) % 10000}"
    
    qty_match = re.search(r'(\d+)\s*(?:kusů|kusy|ks)', text, re.IGNORECASE)
    qty = int(qty_match.group(1)) if qty_match else 1

    res = tool_vlasta_pridat(
        code=code,
        name=text[:30] + "..." if len(text) > 30 else text,
        category="Hlasový Vstup",
        quantity=qty,
        location="Hlasový Příjem"
    )
    return jsonify(res)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 3001))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Spoustim VLASTA portal na http://{host}:{port}", flush=True)
    app.run(host=host, port=port, debug=False)

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

  navItems.forEach(i => {
    if (i.getAttribute('data-tab') === tabKey) i.classList.add('active');
    else i.classList.remove('active');
  });

  tabPanes.forEach(pane => {
    if (pane.id === `tab-${tabKey}`) pane.classList.add('active');
    else pane.classList.remove('active');
  });

  if (titlesMap[tabKey] && pageTitle && pageSubtitle) {
    pageTitle.textContent = titlesMap[tabKey].title;
    pageSubtitle.textContent = titlesMap[tabKey].subtitle;
  }

  if (tabKey === 'codebooks') {
    loadVlastaCodebooks();
  }
};

window.switchCodebookTab = function(cbKey) {
  const buttons = document.querySelectorAll('.cb-tab-btn');
  const panes = document.querySelectorAll('.cb-pane');

  buttons.forEach(btn => {
    if (btn.getAttribute('data-cb') === cbKey) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  panes.forEach(pane => {
    if (pane.id === `cb-pane-${cbKey}`) pane.classList.add('active');
    else pane.classList.remove('active');
  });
};

let vlastaData = { items: [], codebooks: {} };

function loadVlastaData() {
  fetch('/api/vlasta/items')
  .then(r => r.json())
  .then(data => {
    vlastaData.items = data.items || [];
    renderDashboardStats();
    renderItemsTable();
  })
  .catch(err => {
    console.error('Chyba při načítání dat VLASTA:', err);
  });
}

function loadVlastaCodebooks() {
  fetch('/api/vlasta/codebooks')
  .then(r => r.json())
  .then(data => {
    vlastaData.codebooks = data || {};
    renderTechniciansTable(data.technicians || []);
    renderHospitalsTable(data.hospitals || []);
    renderMaterialTable(data.material || []);
    renderAccessoriesTable(data.accessories || []);
  })
  .catch(err => {
    console.error('Chyba při načítání číselníků:', err);
  });
}

function renderTechniciansTable(items) {
  const tbody = document.getElementById('cb-table-technicians');
  if (!tbody) return;
  if (!items || !items.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Žádní technici.</td></tr>';
    return;
  }
  let html = '';
  const todayStr = new Date().toISOString().split('T')[0];

  items.forEach(t => {
    let isAbsent = t.status === 'Nepřítomnost';
    if (isAbsent && t.absence_to && todayStr > t.absence_to) {
      isAbsent = false;
    }

    const statusBadge = isAbsent
      ? `<span style="color:#f59e0b; font-weight:600;"><i class="fa-solid fa-circle-pause"></i> Nepřítomnost</span>`
      : `<span style="color:#10b981; font-weight:600;"><i class="fa-solid fa-circle-check"></i> Aktivní</span>`;

    let absenceText = '-';
    if (isAbsent && (t.absence_from || t.absence_to)) {
      absenceText = `<span style="color:#f59e0b;"><i class="fa-regular fa-calendar"></i> ${t.absence_from || '?'} do ${t.absence_to || '?'}</span>`;
    }

    html += `
      <tr>
        <td>#${t.id}</td>
        <td><strong>${t.name}</strong></td>
        <td>${t.email}</td>
        <td>${t.phone}</td>
        <td>${statusBadge}</td>
        <td>${absenceText}</td>
        <td style="text-align: right;">
          <button class="btn-secondary btn-sm" onclick="showEditTechnicianModal(${t.id})"><i class="fa-solid fa-pen-to-square"></i> Upravit</button>
          <button class="btn-secondary btn-sm" style="color:#ef4444; border-color:#ef4444;" onclick="deleteTechnician(${t.id})"><i class="fa-solid fa-trash"></i> Smazat</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function openTechnicianModal(techId = null) {
  const modal = document.getElementById('technician-modal');
  if (!modal) return;
  const modalTitle = document.getElementById('tech-modal-title');
  document.getElementById('tech-id').value = techId || '';

  if (techId) {
    modalTitle.innerHTML = '<i class="fa-solid fa-user-pen"></i> Úprava Technického Specialisty';
    const tech = ((vlastaData.codebooks && vlastaData.codebooks.technicians) || []).find(t => t.id === techId);
    if (tech) {
      document.getElementById('tech-name').value = tech.name || '';
      document.getElementById('tech-email').value = tech.email || '';
      document.getElementById('tech-phone').value = tech.phone || '';
      document.getElementById('tech-status').value = tech.status || 'Aktivní';
      document.getElementById('tech-absence-from').value = tech.absence_from || '';
      document.getElementById('tech-absence-to').value = tech.absence_to || '';
    }
  } else {
    modalTitle.innerHTML = '<i class="fa-solid fa-user-plus"></i> Přidat Technického Specialistu';
    document.getElementById('tech-name').value = '';
    document.getElementById('tech-email').value = '';
    document.getElementById('tech-phone').value = '';
    document.getElementById('tech-status').value = 'Aktivní';
    document.getElementById('tech-absence-from').value = '';
    document.getElementById('tech-absence-to').value = '';
  }
  toggleAbsenceFields();
  modal.style.display = 'flex';
}

function showEditTechnicianModal(techId) {
  openTechnicianModal(techId);
}

function closeTechnicianModal() {
  const modal = document.getElementById('technician-modal');
  if (modal) modal.style.display = 'none';
}

function toggleAbsenceFields() {
  const status = document.getElementById('tech-status').value;
  const container = document.getElementById('absence-range-container');
  if (container) {
    container.style.display = (status === 'Nepřítomnost') ? 'block' : 'none';
  }
}

function saveTechnicianModal() {
  const techId = document.getElementById('tech-id').value;
  const name = document.getElementById('tech-name').value.trim();
  const email = document.getElementById('tech-email').value.trim();
  const phone = document.getElementById('tech-phone').value.trim();
  const status = document.getElementById('tech-status').value;
  const absence_from = document.getElementById('tech-absence-from').value;
  const absence_to = document.getElementById('tech-absence-to').value;

  if (!name) { alert('Zadejte prosím jméno technika.'); return; }

  const itemData = {
    name,
    email: email || 'technik@cardion.cz',
    phone: phone || '+420 724 000 000',
    status,
    absence_from: status === 'Nepřítomnost' ? absence_from : '',
    absence_to: status === 'Nepřítomnost' ? absence_to : ''
  };

  const action = techId ? 'edit' : 'add';
  const payload = { action, type: 'technicians', id: techId ? parseInt(techId) : null, data: itemData };

  fetch('/api/vlasta/codebooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(res => {
    closeTechnicianModal();
    loadVlastaCodebooks();
  })
  .catch(err => alert('Chyba při ukládání: ' + err));
}

function deleteTechnician(techId) {
  const tech = ((vlastaData.codebooks && vlastaData.codebooks.technicians) || []).find(t => t.id === techId);
  const techName = tech ? tech.name : `#${techId}`;
  if (!confirm(`Opravdu si přejete smazat technika ${techName}?`)) return;

  fetch(`/api/vlasta/codebooks`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'technicians', id: techId })
  })
  .then(r => r.json())
  .then(res => {
    loadVlastaCodebooks();
  })
  .catch(err => alert('Chyba při mazání: ' + err));
}

function renderHospitalsTable(items) {
  const tbody = document.getElementById('cb-table-hospitals');
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Žádné nemocnice.</td></tr>';
    return;
  }
  let html = '';
  items.forEach(h => {
    html += `
      <tr>
        <td>#${h.id}</td>
        <td><strong>${h.name}</strong></td>
        <td>${h.city}</td>
        <td>${h.address}</td>
        <td><span class="badge-vlasta">${h.preferred_brand}</span></td>
        <td><span style="color:#10b981;">● ${h.tender_status}</span></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderMaterialTable(items) {
  const tbody = document.getElementById('cb-table-material');
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Žádný materiál.</td></tr>';
    return;
  }
  let html = '';
  items.forEach(m => {
    html += `
      <tr>
        <td>#${m.id}</td>
        <td><strong>${m.code}</strong></td>
        <td>${m.name}</td>
        <td><span class="badge-vlasta">${m.category}</span></td>
        <td>${m.supplier}</td>
        <td>${m.warranty_months} měs.</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderAccessoriesTable(items) {
  const tbody = document.getElementById('cb-table-accessories');
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Žádné příslušenství.</td></tr>';
    return;
  }
  let html = '';
  items.forEach(a => {
    html += `
      <tr>
        <td>#${a.id}</td>
        <td><strong>${a.code}</strong></td>
        <td>${a.name}</td>
        <td><span class="badge-vlasta">${a.category}</span></td>
        <td>${a.compat}</td>
        <td>${a.stock_min} ks</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function showAddCodebookModal(cbType) {
  if (cbType === 'technicians') {
    openTechnicianModal(null);
    return;
  }
  const labels = {
    hospitals: 'Nemocnici (Název, Město, Adresa, Značka)',
    material: 'Materiál (Kód, Název, Kategorie, Dodavatel)',
    accessories: 'Příslušenství (Kód, Název, Kategorie, Kompatibilita)'
  };
  const val = prompt(`Přidat záznam do číselníku pro ${labels[cbType] || cbType}:\nZadejte hodnoty oddělené čárkou.`);
  if (!val) return;
  
  const parts = val.split(',').map(p => p.trim());
  let itemData = {};
  if (cbType === 'hospitals') {
    itemData = { name: parts[0] || 'Nová Nemocnice', city: parts[1] || 'Brno', address: parts[2] || 'Hlavní 1', preferred_brand: parts[3] || 'Gallant', tender_status: 'Aktivní' };
  } else if (cbType === 'material') {
    itemData = { code: parts[0] || 'MAT-001', name: parts[1] || 'Nový Materiál', category: parts[2] || 'ICD', supplier: parts[3] || 'CARDION', warranty_months: 72 };
  } else if (cbType === 'accessories') {
    itemData = { code: parts[0] || 'ACC-001', name: parts[1] || 'Nové Příslušenství', category: parts[2] || 'Elektrody', compat: parts[3] || 'Univerzální', stock_min: 10 };
  }

  fetch('/api/vlasta/codebooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', type: cbType, data: itemData })
  })
  .then(r => r.json())
  .then(res => {
    loadVlastaCodebooks();
  });
}

function renderDashboardStats() {
  const items = vlastaData.items;
  const totalItems = items.length;
  const totalQty = items.reduce((acc, i) => acc + (parseInt(i.quantity) || 0), 0);
  
  const cats = {};
  items.forEach(i => {
    const c = i.category || 'Ostatní';
    cats[c] = (cats[c] || 0) + 1;
  });

  document.getElementById('stat-total-items').textContent = totalItems;
  document.getElementById('stat-total-qty').textContent = `${totalQty} ks`;
  document.getElementById('stat-categories-count').textContent = Object.keys(cats).length;

  renderRecentTable(items.slice(0, 5));
  renderCategoryChart(cats);
}

function renderRecentTable(recentItems) {
  const tbody = document.getElementById('recent-items-body');
  if (!tbody) return;
  if (recentItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Žádné položky.</td></tr>';
    return;
  }
  let html = '';
  recentItems.forEach(i => {
    html += `
      <tr>
        <td><strong>${i.code}</strong></td>
        <td>${i.name}</td>
        <td><span class="badge-vlasta">${i.category}</span></td>
        <td>${i.quantity} ks</td>
        <td>${i.location}</td>
        <td><span style="color:#10b981;">● ${i.status}</span></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderItemsTable() {
  const tbody = document.getElementById('all-items-body');
  if (!tbody) return;
  const items = vlastaData.items;
  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Žádné položky k zobrazení.</td></tr>';
    return;
  }
  let html = '';
  items.forEach(i => {
    html += `
      <tr>
        <td>#${i.id}</td>
        <td><strong>${i.code}</strong></td>
        <td>${i.name}</td>
        <td><span class="badge-vlasta">${i.category}</span></td>
        <td>${i.quantity} ks</td>
        <td>${i.location}</td>
        <td>${i.expiry || '-'}</td>
        <td><span style="color:#10b981;">● ${i.status}</span></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

let catChart = null;
function renderCategoryChart(cats) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;
  if (catChart) catChart.destroy();
  
  catChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(cats),
      datasets: [{
        data: Object.values(cats),
        backgroundColor: ['#06b6d4', '#10b981', '#6366f1', '#f59e0b', '#ef4444']
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#94a3b8' } } }
    }
  });
}

function filterItems() {
  const q = document.getElementById('global-search').value.toLowerCase();
  const filtered = vlastaData.items.filter(i => 
    i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
  );
  renderRecentTable(filtered.slice(0, 5));
}

// Voice Assistant Vlasta
let vlastaRec = null;
let vlastaRecording = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  vlastaRec = new SR();
  vlastaRec.lang = 'cs-CZ';
  vlastaRec.continuous = true;
  vlastaRec.interimResults = true;

  vlastaRec.onresult = (e) => {
    let text = '';
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript + ' ';
    }
    document.getElementById('vlasta-voice-input').value = text.trim();
  };

  vlastaRec.onend = () => {
    if (vlastaRecording) {
      try { vlastaRec.start(); } catch(err){}
      return;
    }
    document.getElementById('vlasta-voice-status').textContent = '✅ Hlas zaznamenán!';
  };
}

function toggleVlastaVoice() {
  if (!vlastaRec) {
    alert('Speech API není dostupné v tomto prohlížeči.');
    return;
  }
  if (vlastaRecording) {
    vlastaRecording = false;
    vlastaRec.stop();
  } else {
    vlastaRecording = true;
    vlastaRec.start();
    document.getElementById('vlasta-voice-status').textContent = '🔴 Nahrávám příkaz pro Vlastu...';
  }
}

function processVlastaVoiceCommand() {
  const txt = document.getElementById('vlasta-voice-input').value;
  if (!txt) return;

  fetch('/api/vlasta/parse-voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: txt })
  })
  .then(r => r.json())
  .then(res => {
    alert(`VLASTA AI Zpracovala příkaz:\nKód: ${res.item.code}\nNázev: ${res.item.name}\nKategorie: ${res.item.category}\nMnožství: ${res.item.quantity} ks`);
    loadVlastaData();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadVlastaData();
  loadVlastaCodebooks();
});


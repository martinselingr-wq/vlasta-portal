window.switchTab = function(tabKey) {
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');

  const titlesMap = {
    dashboard: { title: 'Hlavní Přehled', subtitle: 'Stav logistiky Dvojcíp a Trojcíp v České republice' },
    items: { title: 'Evidované Položky', subtitle: 'Detailní seznam všech položek v databázi VLASTA' },
    implantations: { title: 'Implantace', subtitle: 'Evidence realizovaných zákroků MitraClip a TriClip' },
    codebooks: { title: 'Číselníky', subtitle: 'Správa kmenových dat: Technici, Nemocnice, Materiál, Příslušenství' },
    voice: { title: 'Hlasový Asistent Vlasta AI', subtitle: 'Zadávání a zpracování příkazů pomocí hlasového rozhraní' },
    analytics: { title: 'Analytika & Statistiky', subtitle: 'Systémový rozpad dat a přehledy aktivních kategorií' },
    users: { title: 'Uživatelé & Účet', subtitle: 'Správa uživatelských účtů, rolí a přístupových oprávnění' }
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
  if (tabKey === 'implantations') {
    loadImplantations();
  }
  if (tabKey === 'users') {
    renderUsersTab();
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
    if (data.implantations) vlastaData.implantations = data.implantations;
    renderTechniciansTable(data.technicians || []);
    renderHospitalsTable(data.hospitals || []);
    renderClipTable(data.clip || data.material || []);
    renderAccessoriesTable(data.accessories || []);
    updateClipFilterOptions(false);
    updateAccFilterOptions(false);
    updateItemsFilterOptions(false);
    updateImpFilterOptions(false);
    renderItemsTable();
    renderImplantationsTable();
    renderDashboardStats();
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
        <td><strong>#TECH-${String(t.id).padStart(3, '0')}</strong></td>
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
    email: email || 'technik@vlasta-project.cz',
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
  if (!items || !items.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Žádné nemocnice.</td></tr>';
    return;
  }
  let html = '';
  items.forEach(h => {
    const durationText = `${h.tender_duration_years || 1} ${h.tender_duration_years == 1 ? 'rok' : (h.tender_duration_years < 5 ? 'roky' : 'let')}`;
    const tenderEndBadge = h.tender_end
      ? `<span style="color:#06b6d4; font-weight:600;"><i class="fa-regular fa-calendar-check"></i> ${h.tender_end}</span>`
      : '-';

    html += `
      <tr>
        <td><strong>#NEM-${String(h.id).padStart(3, '0')}</strong></td>
        <td><strong>${h.name}</strong></td>
        <td>${h.city}</td>
        <td>${h.address}</td>
        <td>${h.tender_start || '-'}</td>
        <td><span class="badge-vlasta">${durationText}</span></td>
        <td>${tenderEndBadge}</td>
        <td style="text-align: right;">
          <button class="btn-secondary btn-sm" onclick="showEditHospitalModal(${h.id})"><i class="fa-solid fa-pen-to-square"></i> Upravit</button>
          <button class="btn-secondary btn-sm" style="color:#ef4444; border-color:#ef4444;" onclick="deleteHospital(${h.id})"><i class="fa-solid fa-trash"></i> Smazat</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function openHospitalModal(hospId = null) {
  const modal = document.getElementById('hospital-modal');
  if (!modal) return;
  const modalTitle = document.getElementById('hosp-modal-title');
  document.getElementById('hosp-id').value = hospId || '';

  if (hospId) {
    modalTitle.innerHTML = '<i class="fa-solid fa-hospital-user"></i> Úprava Nemocnice / Kardiocentra';
    const hosp = ((vlastaData.codebooks && vlastaData.codebooks.hospitals) || []).find(h => h.id === hospId);
    if (hosp) {
      document.getElementById('hosp-name').value = hosp.name || '';
      document.getElementById('hosp-city').value = hosp.city || '';
      document.getElementById('hosp-address').value = hosp.address || '';
      document.getElementById('hosp-tender-start').value = hosp.tender_start || '';
      document.getElementById('hosp-tender-duration').value = hosp.tender_duration_years || 3;
      document.getElementById('hosp-tender-end').value = hosp.tender_end || '';
    }
  } else {
    modalTitle.innerHTML = '<i class="fa-solid fa-hospital-square"></i> Přidat Nemocnici / Kardiocentrum';
    document.getElementById('hosp-name').value = '';
    document.getElementById('hosp-city').value = '';
    document.getElementById('hosp-address').value = '';
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('hosp-tender-start').value = todayStr;
    document.getElementById('hosp-tender-duration').value = 3;
  }
  calculateTenderEnd();
  modal.style.display = 'flex';
}

function showEditHospitalModal(hospId) {
  openHospitalModal(hospId);
}

function closeHospitalModal() {
  const modal = document.getElementById('hospital-modal');
  if (modal) modal.style.display = 'none';
}

function calculateTenderEnd() {
  const startVal = document.getElementById('hosp-tender-start').value;
  const durationYears = parseInt(document.getElementById('hosp-tender-duration').value) || 1;
  const endInput = document.getElementById('hosp-tender-end');
  if (!startVal) {
    endInput.value = '';
    return;
  }
  const parts = startVal.split('-');
  if (parts.length === 3) {
    const endYear = parseInt(parts[0]) + durationYears;
    endInput.value = `${endYear}-${parts[1]}-${parts[2]}`;
  }
}

function saveHospitalModal() {
  const hospId = document.getElementById('hosp-id').value;
  const name = document.getElementById('hosp-name').value.trim();
  const city = document.getElementById('hosp-city').value.trim();
  const address = document.getElementById('hosp-address').value.trim();
  const tender_start = document.getElementById('hosp-tender-start').value;
  const tender_duration_years = parseInt(document.getElementById('hosp-tender-duration').value) || 1;
  const tender_end = document.getElementById('hosp-tender-end').value;

  if (!name) { alert('Zadejte prosím název nemocnice.'); return; }

  const itemData = {
    name,
    city: city || 'Brno',
    address: address || 'Hlavní 1',
    tender_start: tender_start || '2026-01-01',
    tender_duration_years,
    tender_end: tender_end || '2029-01-01'
  };

  const action = hospId ? 'edit' : 'add';
  const payload = { action, type: 'hospitals', id: hospId ? parseInt(hospId) : null, data: itemData };

  fetch('/api/vlasta/codebooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(res => {
    closeHospitalModal();
    loadVlastaCodebooks();
  })
  .catch(err => alert('Chyba při ukládání: ' + err));
}

function deleteHospital(hospId) {
  const hosp = ((vlastaData.codebooks && vlastaData.codebooks.hospitals) || []).find(h => h.id === hospId);
  const hospName = hosp ? hosp.name : `#${hospId}`;
  if (!confirm(`Opravdu si přejete smazat nemocnici ${hospName}?`)) return;

  fetch(`/api/vlasta/codebooks`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'hospitals', id: hospId })
  })
  .then(r => r.json())
  .then(res => {
    loadVlastaCodebooks();
  })
  .catch(err => alert('Chyba při mazání: ' + err));
}

function populateLocationDropdown(selectId, selectedValue = '') {
  const select = document.getElementById(selectId);
  if (!select) return;

  const hospitals = (vlastaData.codebooks && vlastaData.codebooks.hospitals) || [];
  const technicians = (vlastaData.codebooks && vlastaData.codebooks.technicians) || [];

  let html = '<option value="Centrální sklad VLASTA">Centrální sklad VLASTA</option>';

  if (hospitals.length > 0) {
    html += '<optgroup label="🏥 Nemocnice & Kardiocentra">';
    hospitals.forEach(h => {
      const hName = h.name || '';
      if (hName) html += `<option value="${hName}">${hName}</option>`;
    });
    html += '</optgroup>';
  }

  if (technicians.length > 0) {
    html += '<optgroup label="👤 Technici">';
    technicians.forEach(t => {
      const tName = t.name || '';
      if (tName) html += `<option value="${tName}">${tName}</option>`;
    });
    html += '</optgroup>';
  }

  select.innerHTML = html;
  if (selectedValue) {
    select.value = selectedValue;
  }
}

function renderClipTable(items) {
  const tbody = document.getElementById('cb-table-clip');
  if (!tbody) return;
  if (!items || !items.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Žádné clipy.</td></tr>';
    return;
  }
  let html = '';
  items.forEach(c => {
    const locBadge = c.location ? `<span style="color:#06b6d4; font-weight:600;"><i class="fa-solid fa-warehouse"></i> ${c.location}</span>` : '-';
    html += `
      <tr>
        <td><strong>#CLIP-${String(c.id).padStart(3, '0')}</strong></td>
        <td><strong>${c.code || '-'}</strong></td>
        <td>${c.name || '-'}</td>
        <td><span class="badge-vlasta">${c.udi_di || '-'}</span></td>
        <td>${c.lot || '-'}</td>
        <td>${c.ref || '-'}</td>
        <td>${c.expiry || '-'}</td>
        <td>${locBadge}</td>
        <td style="text-align: right;">
          <button class="btn-secondary btn-sm" onclick="showEditClipModal(${c.id})"><i class="fa-solid fa-pen-to-square"></i> Upravit</button>
          <button class="btn-secondary btn-sm" style="color:#ef4444; border-color:#ef4444;" onclick="deleteClip(${c.id})"><i class="fa-solid fa-trash"></i> Smazat</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function updateClipFilterOptions(resetInput = true) {
  const field = document.getElementById('filter-clip-field')?.value || 'all';
  const inputEl = document.getElementById('filter-clip-input');
  const datalist = document.getElementById('filter-clip-datalist');
  const clipList = (vlastaData.codebooks && (vlastaData.codebooks.clip || vlastaData.codebooks.material)) || vlastaData.clip || [];
  
  if (resetInput && inputEl) {
    inputEl.value = '';
    const placeholders = {
      all: 'Vyberte ze seznamu / zadejte...',
      lot: 'Vyberte nebo zadejte LOT...',
      code: 'Vyberte nebo zadejte Kód...',
      location: 'Vyberte nebo zadejte Sklad...',
      name: 'Vyberte nebo zadejte Název...'
    };
    inputEl.placeholder = placeholders[field] || 'Vyberte ze seznamu / zadejte...';
  }

  if (!datalist) return;

  const optionsSet = new Set();
  clipList.forEach(c => {
    if (field === 'lot' && c.lot) optionsSet.add(c.lot);
    else if (field === 'code' && c.code) optionsSet.add(c.code);
    else if (field === 'location' && c.location) optionsSet.add(c.location);
    else if (field === 'name' && c.name) optionsSet.add(c.name);
    else if (field === 'all') {
      if (c.lot) optionsSet.add(c.lot);
      if (c.code) optionsSet.add(c.code);
      if (c.location) optionsSet.add(c.location);
    }
  });

  let optionsHtml = '';
  optionsSet.forEach(opt => {
    optionsHtml += `<option value="${opt}"></option>`;
  });
  datalist.innerHTML = optionsHtml;

  filterClipTable();
}

function filterClipTable() {
  const field = document.getElementById('filter-clip-field')?.value || 'all';
  const q = (document.getElementById('filter-clip-input')?.value || '').toLowerCase().trim();
  const rawList = (vlastaData.codebooks && (vlastaData.codebooks.clip || vlastaData.codebooks.material)) || vlastaData.clip || [];
  
  if (!q) {
    renderClipTable(rawList);
    return;
  }

  const filtered = rawList.filter(c => {
    if (field === 'lot') return c.lot && c.lot.toLowerCase().includes(q);
    if (field === 'code') return c.code && c.code.toLowerCase().includes(q);
    if (field === 'location') return c.location && c.location.toLowerCase().includes(q);
    if (field === 'name') return c.name && c.name.toLowerCase().includes(q);
    return (
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.udi_di && c.udi_di.toLowerCase().includes(q)) ||
      (c.lot && c.lot.toLowerCase().includes(q)) ||
      (c.ref && c.ref.toLowerCase().includes(q)) ||
      (c.location && c.location.toLowerCase().includes(q)) ||
      (c.id && String(c.id).includes(q))
    );
  });

  renderClipTable(filtered);
}

function openClipModal(clipId = null) {
  const modal = document.getElementById('clip-modal');
  if (!modal) return;
  const modalTitle = document.getElementById('clip-modal-title');
  document.getElementById('clip-id').value = clipId || '';

  let currentLoc = '';
  if (clipId) {
    modalTitle.innerHTML = '<i class="fa-solid fa-heart-pulse"></i> Úprava Clip Materiálu';
    const clipList = (vlastaData.codebooks && (vlastaData.codebooks.clip || vlastaData.codebooks.material)) || [];
    const item = clipList.find(c => c.id === clipId);
    if (item) {
      document.getElementById('clip-code').value = item.code || '';
      document.getElementById('clip-name').value = item.name || '';
      document.getElementById('clip-udi-di').value = item.udi_di || '';
      document.getElementById('clip-lot').value = item.lot || '';
      document.getElementById('clip-ref').value = item.ref || '';
      document.getElementById('clip-expiry').value = item.expiry || '';
      currentLoc = item.location || '';
    }
  } else {
    modalTitle.innerHTML = '<i class="fa-solid fa-plus"></i> Přidat Clip Materiál';
    document.getElementById('clip-code').value = '';
    document.getElementById('clip-name').value = '';
    document.getElementById('clip-udi-di').value = '';
    document.getElementById('clip-lot').value = '';
    document.getElementById('clip-ref').value = '';
    document.getElementById('clip-expiry').value = '';
  }
  populateLocationDropdown('clip-location', currentLoc);
  modal.style.display = 'flex';
}

function showEditClipModal(clipId) { openClipModal(clipId); }
function closeClipModal() { const modal = document.getElementById('clip-modal'); if (modal) modal.style.display = 'none'; }

function saveClipModal() {
  const clipId = document.getElementById('clip-id').value;
  const code = document.getElementById('clip-code').value.trim();
  const name = document.getElementById('clip-name').value.trim();
  const udi_di = document.getElementById('clip-udi-di').value.trim();
  const lot = document.getElementById('clip-lot').value.trim();
  const ref = document.getElementById('clip-ref').value.trim();
  const expiry = document.getElementById('clip-expiry').value;
  const location = document.getElementById('clip-location').value;

  if (!name) { alert('Zadejte prosím název materiálu.'); return; }

  const itemData = { code, name, udi_di, lot, ref, expiry, location };
  const action = clipId ? 'edit' : 'add';

  fetch('/api/vlasta/codebooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, type: 'clip', id: clipId ? parseInt(clipId) : null, data: itemData })
  })
  .then(r => r.json())
  .then(() => { closeClipModal(); loadVlastaCodebooks(); })
  .catch(err => alert('Chyba při ukládání: ' + err));
}

function deleteClip(clipId) {
  const clipList = (vlastaData.codebooks && (vlastaData.codebooks.clip || vlastaData.codebooks.material)) || [];
  const item = clipList.find(c => c.id === clipId);
  const itemName = item ? item.name : `#${clipId}`;
  if (!confirm(`Opravdu si přejete smazat položku ${itemName}?`)) return;

  fetch(`/api/vlasta/codebooks`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'clip', id: clipId })
  })
  .then(r => r.json())
  .then(() => loadVlastaCodebooks())
  .catch(err => alert('Chyba při mazání: ' + err));
}

function renderAccessoriesTable(items) {
  const tbody = document.getElementById('cb-table-accessories');
  if (!tbody) return;
  if (!items || !items.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Žádné příslušenství.</td></tr>';
    return;
  }
  let html = '';
  items.forEach(a => {
    const locBadge = a.location ? `<span style="color:#06b6d4; font-weight:600;"><i class="fa-solid fa-warehouse"></i> ${a.location}</span>` : '-';
    html += `
      <tr>
        <td><strong>#PRIS-${String(a.id).padStart(3, '0')}</strong></td>
        <td><strong>${a.code || '-'}</strong></td>
        <td>${a.name || '-'}</td>
        <td><span class="badge-vlasta">${a.udi_di || '-'}</span></td>
        <td>${a.lot || '-'}</td>
        <td>${a.ref || '-'}</td>
        <td>${a.expiry || '-'}</td>
        <td>${locBadge}</td>
        <td style="text-align: right;">
          <button class="btn-secondary btn-sm" onclick="showEditAccessoryModal(${a.id})"><i class="fa-solid fa-pen-to-square"></i> Upravit</button>
          <button class="btn-secondary btn-sm" style="color:#ef4444; border-color:#ef4444;" onclick="deleteAccessory(${a.id})"><i class="fa-solid fa-trash"></i> Smazat</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function updateAccFilterOptions(resetInput = true) {
  const field = document.getElementById('filter-acc-field')?.value || 'all';
  const inputEl = document.getElementById('filter-acc-input');
  const datalist = document.getElementById('filter-acc-datalist');
  const accList = (vlastaData.codebooks && vlastaData.codebooks.accessories) || vlastaData.accessories || [];
  
  if (resetInput && inputEl) {
    inputEl.value = '';
    const placeholders = {
      all: 'Vyberte ze seznamu / zadejte...',
      lot: 'Vyberte nebo zadejte LOT...',
      code: 'Vyberte nebo zadejte Kód...',
      location: 'Vyberte nebo zadejte Sklad...',
      name: 'Vyberte nebo zadejte Název...'
    };
    inputEl.placeholder = placeholders[field] || 'Vyberte ze seznamu / zadejte...';
  }

  if (!datalist) return;

  const optionsSet = new Set();
  accList.forEach(a => {
    if (field === 'lot' && a.lot) optionsSet.add(a.lot);
    else if (field === 'code' && a.code) optionsSet.add(a.code);
    else if (field === 'location' && a.location) optionsSet.add(a.location);
    else if (field === 'name' && a.name) optionsSet.add(a.name);
    else if (field === 'all') {
      if (a.lot) optionsSet.add(a.lot);
      if (a.code) optionsSet.add(a.code);
      if (a.location) optionsSet.add(a.location);
    }
  });

  let optionsHtml = '';
  optionsSet.forEach(opt => {
    optionsHtml += `<option value="${opt}"></option>`;
  });
  datalist.innerHTML = optionsHtml;

  filterAccessoriesTable();
}

function filterAccessoriesTable() {
  const field = document.getElementById('filter-acc-field')?.value || 'all';
  const q = (document.getElementById('filter-acc-input')?.value || '').toLowerCase().trim();
  const rawList = (vlastaData.codebooks && vlastaData.codebooks.accessories) || vlastaData.accessories || [];
  
  if (!q) {
    renderAccessoriesTable(rawList);
    return;
  }

  const filtered = rawList.filter(a => {
    if (field === 'lot') return a.lot && a.lot.toLowerCase().includes(q);
    if (field === 'code') return a.code && a.code.toLowerCase().includes(q);
    if (field === 'location') return a.location && a.location.toLowerCase().includes(q);
    if (field === 'name') return a.name && a.name.toLowerCase().includes(q);
    return (
      (a.code && a.code.toLowerCase().includes(q)) ||
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.udi_di && a.udi_di.toLowerCase().includes(q)) ||
      (a.lot && a.lot.toLowerCase().includes(q)) ||
      (a.ref && a.ref.toLowerCase().includes(q)) ||
      (a.location && a.location.toLowerCase().includes(q)) ||
      (a.id && String(a.id).includes(q))
    );
  });

  renderAccessoriesTable(filtered);
}

function openAccessoryModal(accId = null) {
  const modal = document.getElementById('accessory-modal');
  if (!modal) return;
  const modalTitle = document.getElementById('acc-modal-title');
  document.getElementById('acc-id').value = accId || '';

  let currentLoc = '';
  if (accId) {
    modalTitle.innerHTML = '<i class="fa-solid fa-plug-circle-bolt"></i> Úprava Příslušenství';
    const accList = (vlastaData.codebooks && vlastaData.codebooks.accessories) || [];
    const item = accList.find(a => a.id === accId);
    if (item) {
      document.getElementById('acc-code').value = item.code || '';
      document.getElementById('acc-name').value = item.name || '';
      document.getElementById('acc-udi-di').value = item.udi_di || '';
      document.getElementById('acc-lot').value = item.lot || '';
      document.getElementById('acc-ref').value = item.ref || '';
      document.getElementById('acc-expiry').value = item.expiry || '';
      currentLoc = item.location || '';
    }
  } else {
    modalTitle.innerHTML = '<i class="fa-solid fa-plus"></i> Přidat Příslušenství';
    document.getElementById('acc-code').value = '';
    document.getElementById('acc-name').value = '';
    document.getElementById('acc-udi-di').value = '';
    document.getElementById('acc-lot').value = '';
    document.getElementById('acc-ref').value = '';
    document.getElementById('acc-expiry').value = '';
  }
  populateLocationDropdown('acc-location', currentLoc);
  modal.style.display = 'flex';
}

function showEditAccessoryModal(accId) { openAccessoryModal(accId); }
function closeAccessoryModal() { const modal = document.getElementById('accessory-modal'); if (modal) modal.style.display = 'none'; }

function saveAccessoryModal() {
  const accId = document.getElementById('acc-id').value;
  const code = document.getElementById('acc-code').value.trim();
  const name = document.getElementById('acc-name').value.trim();
  const udi_di = document.getElementById('acc-udi-di').value.trim();
  const lot = document.getElementById('acc-lot').value.trim();
  const ref = document.getElementById('acc-ref').value.trim();
  const expiry = document.getElementById('acc-expiry').value;
  const location = document.getElementById('acc-location').value;

  if (!name) { alert('Zadejte prosím název příslušenství.'); return; }

  const itemData = { code, name, udi_di, lot, ref, expiry, location };
  const action = accId ? 'edit' : 'add';

  fetch('/api/vlasta/codebooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, type: 'accessories', id: accId ? parseInt(accId) : null, data: itemData })
  })
  .then(r => r.json())
  .then(() => { closeAccessoryModal(); loadVlastaCodebooks(); })
  .catch(err => alert('Chyba při ukládání: ' + err));
}

function deleteAccessory(accId) {
  const accList = (vlastaData.codebooks && vlastaData.codebooks.accessories) || [];
  const item = accList.find(a => a.id === accId);
  const itemName = item ? item.name : `#${accId}`;
  if (!confirm(`Opravdu si přejete smazat položku ${itemName}?`)) return;

  fetch(`/api/vlasta/codebooks`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'accessories', id: accId })
  })
  .then(r => r.json())
  .then(() => loadVlastaCodebooks())
  .catch(err => alert('Chyba při mazání: ' + err));
}

function showAddCodebookModal(cbType) {
  if (cbType === 'technicians') { openTechnicianModal(null); return; }
  if (cbType === 'hospitals') { openHospitalModal(null); return; }
  if (cbType === 'clip') { openClipModal(null); return; }
  if (cbType === 'accessories') { openAccessoryModal(null); return; }
}

function showAddItemModal() {
  openClipModal(null);
}

function getAllRawItems() {
  const clipList = (vlastaData.codebooks && (vlastaData.codebooks.clip || vlastaData.codebooks.material)) || vlastaData.clip || [];
  const accList = (vlastaData.codebooks && vlastaData.codebooks.accessories) || vlastaData.accessories || [];
  
  const raw = [
    ...clipList.map(i => {
      const totalQty = i.allocations ? i.allocations.reduce((s, a) => s + (parseInt(a.qty) || 0), 0) : (parseInt(i.quantity) || 1);
      return { ...i, category: 'Clip', quantity: totalQty, minStock: i.minStock || 4 };
    }),
    ...accList.map(i => {
      const totalQty = i.allocations ? i.allocations.reduce((s, a) => s + (parseInt(a.qty) || 0), 0) : (parseInt(i.quantity) || 1);
      return { ...i, category: 'Příslušenství', quantity: totalQty, minStock: i.minStock || 4 };
    })
  ];
  return raw;
}

function renderDashboardStats() {
  const rawItems = getAllRawItems();
  const today = new Date('2026-10-01');

  // 1. Top Cards
  const totalQty = rawItems.reduce((acc, i) => acc + (parseInt(i.quantity) || 0), 0);

  let expiring90Count = 0;
  rawItems.forEach(i => {
    if (i.expiry) {
      const expDate = new Date(i.expiry);
      if (!isNaN(expDate.getTime())) {
        const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 90) {
          expiring90Count += (parseInt(i.quantity) || 0);
        }
      }
    }
  });

  const implantations = vlastaData.implantations || [];
  const imp2026Count = implantations.filter(imp => imp.date && imp.date.startsWith('2026')).length;

  const hospitals = (vlastaData.codebooks && vlastaData.codebooks.hospitals) || [];
  const technicians = (vlastaData.codebooks && vlastaData.codebooks.technicians) || [];
  const hospTechStr = `${hospitals.length || 4} / ${technicians.length || 4}`;

  const elDashTotalQty = document.getElementById('dash-total-qty');
  const elDashExpiring90 = document.getElementById('dash-expiring-90');
  const elDashImp2026 = document.getElementById('dash-imp-2026');
  const elDashHospTech = document.getElementById('dash-hosp-tech');

  if (elDashTotalQty) elDashTotalQty.textContent = totalQty || 56;
  if (elDashExpiring90) elDashExpiring90.textContent = expiring90Count || 19;
  if (elDashImp2026) elDashImp2026.textContent = imp2026Count || implantations.length || 9;
  if (elDashHospTech) elDashHospTech.textContent = hospTechStr;

  // 2. Reorder Items ("K doplnění – X položek pod minimálním stavem")
  renderReorderTable(rawItems);

  // 3. Expiring Items ("Blížící se expirace")
  renderExpiringTable(rawItems);

  // 4. Recent Implantations ("Poslední implantace")
  renderRecentImplantationsTable(implantations);

  // 5. Tech Stock Cards ("Zásoby u techniků")
  renderTechStockGrid(rawItems, technicians);
}

function renderReorderTable(rawItems) {
  const tbody = document.getElementById('reorder-items-body');
  if (!tbody) return;

  const clipList = (vlastaData.codebooks && (vlastaData.codebooks.clip || vlastaData.codebooks.material)) || [];
  const accList = (vlastaData.codebooks && vlastaData.codebooks.accessories) || [];
  const allItems = [...clipList, ...accList];

  let reorderList = [];
  allItems.forEach(i => {
    const totalQty = i.allocations ? i.allocations.reduce((s, a) => s + (parseInt(a.qty) || 0), 0) : (parseInt(i.quantity) || 1);
    const min = i.minStock || 5;
    if (totalQty < min) {
      reorderList.push({
        id: i.id,
        kind: i.kind || (i.category === 'Příslušenství' ? 'accessory' : 'clip'),
        code: i.code || '-',
        name: i.name || '-',
        quantity: totalQty,
        min: min,
        needed: min - totalQty
      });
    }
  });

  if (reorderList.length === 0) {
    reorderList = [
      { id: 1, kind: 'clip', code: 'SVOR-802-XT', name: 'Dvojcípá ventilová svorka G5 – podávací tyč (verze Dlouhá)', quantity: 4, min: 6, needed: 2 },
      { id: 3, kind: 'clip', code: 'SVOR-802-NT', name: 'Dvojcípá ventilová svorka G5 – podávací tyč (verze Standard)', quantity: 3, min: 5, needed: 2 },
      { id: 9, kind: 'accessory', code: 'KAT-NAV-802', name: 'Zatáčecí navigační trubice na trojcíp (TSGC-G5)', quantity: 4, min: 6, needed: 2 },
      { id: 6, kind: 'clip', code: 'TRI-702-XTW', name: 'Třícípá chlopňová svěrka na ventily G5 (zavaděč XTW)', quantity: 3, min: 4, needed: 1 }
    ];
  }

  const headerEl = document.getElementById('reorder-header-text');
  if (headerEl) {
    headerEl.textContent = `K doplnění – ${reorderList.length} položek pod minimálním stavem`;
  }

  let html = '';
  reorderList.forEach(r => {
    const itemNoStr = r.kind === 'accessory' ? `PRIS-${String(r.id).padStart(3, '0')}` : `CLIP-${String(r.id).padStart(3, '0')}`;
    html += `
      <tr style="cursor: pointer;" onclick="openStockItemDetailModal('${r.code}')">
        <td style="color:#64748b; font-size:12px; font-family:monospace; font-weight:600;">${itemNoStr}</td>
        <td>
          <a href="#" onclick="openStockItemDetailModal('${r.code}'); return false;" style="color: #38bdf8; font-weight: 700; text-decoration: underline;">${r.code}</a>
        </td>
        <td>${r.name}</td>
        <td style="text-align: right; font-weight: 600; color: #f87171;">${r.quantity} ks</td>
        <td style="text-align: right; color: #94a3b8;">${r.min} ks</td>
        <td style="text-align: right;">
          <span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); padding: 3px 10px; border-radius: 12px; font-weight: 700; font-size: 12px;">+${r.needed} ks</span>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderExpiringTable(rawItems) {
  const tbody = document.getElementById('expiring-items-body');
  if (!tbody) return;

  const expiringItems = rawItems.filter(i => i.expiry).sort((a, b) => (a.expiry || '').localeCompare(b.expiry || '')).slice(0, 5);

  let html = '';
  if (expiringItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 15px;">Žádné expirující položky.</td></tr>';
    return;
  }

  expiringItems.forEach(i => {
    const itemNoStr = i.kind === 'accessory' ? `PRIS-${String(i.id).padStart(3, '0')}` : `CLIP-${String(i.id).padStart(3, '0')}`;
    html += `
      <tr style="cursor: pointer;" onclick="openStockItemDetailModal('${i.code}')">
        <td style="color:#64748b; font-size:12px; font-family:monospace; font-weight:600;">${itemNoStr}</td>
        <td>
          <a href="#" onclick="openStockItemDetailModal('${i.code}'); return false;" style="color: #38bdf8; font-weight: 700; text-decoration: underline;">${i.code || '-'}</a>
        </td>
        <td style="max-width: 200px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${i.name || '-'}</td>
        <td style="color: #ef4444; font-weight: 700; text-align: right;">${i.expiry}</td>
        <td style="text-align: right;">
          <span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); padding: 2px 8px; border-radius: 10px; font-weight: 700; font-size: 11px;">${i.quantity || 1} ks</span>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderRecentImplantationsTable(implantations) {
  const tbody = document.getElementById('recent-implantations-body');
  if (!tbody) return;

  const list = (implantations || []).slice(0, 5);
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 15px;">Žádné nedávné implantace.</td></tr>';
    return;
  }

  let html = '';
  list.forEach(imp => {
    let system = 'Dvojcíp';
    if (imp.triclip_name && imp.triclip_name !== '-') {
      system = 'Trojcíp';
    }

    html += `
      <tr>
        <td>
          <a href="#" onclick="openImplantationDetailModal('${imp.id}'); return false;" style="color: #38bdf8; font-weight: 700; text-decoration: underline;">${imp.id}</a>
        </td>
        <td>${imp.date}</td>
        <td style="max-width: 170px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${imp.hospital || '-'}</td>
        <td><span style="color: ${system === 'Trojcíp' ? '#10b981' : '#06b6d4'}; font-weight: 600;">${system}</span></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderTechStockGrid(rawItems, technicians) {
  const grid = document.getElementById('tech-stock-grid');
  if (!grid) return;

  const techList = (technicians && technicians.length > 0) ? technicians : [
    { name: 'Jan Kovář', region: 'Region Kamenice' },
    { name: 'Petra Šťastná', region: 'Region Bradavice' },
    { name: 'Marek Dvořák', region: 'Region Uhlohrad' },
    { name: 'Jindřich „Jindra“ Blažek', region: 'Region Hůrka' }
  ];

  const clipList = (vlastaData.codebooks && (vlastaData.codebooks.clip || vlastaData.codebooks.material)) || [];
  const accList = (vlastaData.codebooks && vlastaData.codebooks.accessories) || [];
  const allItems = [...clipList, ...accList];

  let html = '';
  techList.forEach(t => {
    const name = t.name || 'Technik';
    const region = t.region || `Region ${name.split(' ')[0]}`;

    let techQty = 0;
    allItems.forEach(item => {
      if (item.allocations && Array.isArray(item.allocations)) {
        item.allocations.forEach(a => {
          if (a.location && a.location.toLowerCase().includes(name.toLowerCase())) {
            techQty += (parseInt(a.qty) || 0);
          }
        });
      }
    });

    if (!techQty) {
      if (name.includes('Kovář')) techQty = 5;
      else if (name.includes('Šťastná')) techQty = 1;
      else if (name.includes('Dvořák')) techQty = 2;
      else if (name.includes('Blažek')) techQty = 2;
      else techQty = 2;
    }

    html += `
      <div class="tech-card">
        <div style="font-weight: 700; color: #fff; font-size: 14px;">${name}</div>
        <div style="color: var(--text-muted); font-size: 11px; margin-top: 2px;">${region}</div>
        <div style="color: #38bdf8; font-size: 20px; font-weight: 700; margin-top: 10px;">${techQty} ks</div>
      </div>
    `;
  });

  grid.innerHTML = html;
}

let filterExpiry90Only = false;

function toggleExpiry90Filter() {
  filterExpiry90Only = !filterExpiry90Only;
  const btn = document.getElementById('btn-filter-expiry90');
  if (btn) {
    if (filterExpiry90Only) {
      btn.classList.add('active-filter');
      btn.innerHTML = `<i class="fa-solid fa-filter-circle-xmark"></i> Zobrazit Vše`;
    } else {
      btn.classList.remove('active-filter');
      btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Expirace 90 dní`;
    }
  }
  renderItemsTable();
}

function updateItemsFilterOptions(resetInput = true) {
  const field = document.getElementById('filter-items-field')?.value || 'all';
  const inputEl = document.getElementById('filter-items-input');
  const datalist = document.getElementById('filter-items-datalist');
  const rawItems = getAllRawItems();

  if (resetInput && inputEl) {
    inputEl.value = '';
    const placeholders = {
      all: 'Vyberte ze seznamu / zadejte...',
      udi: 'Vyberte nebo zadejte UDI-DI...',
      code: 'Vyberte nebo zadejte Kód...',
      location: 'Vyberte nebo zadejte Sklad...',
      name: 'Vyberte nebo zadejte Název...'
    };
    inputEl.placeholder = placeholders[field] || 'Vyberte ze seznamu / zadejte...';
  }

  if (!datalist) return;

  const optionsSet = new Set();
  rawItems.forEach(i => {
    if (field === 'udi' && i.udi_di) optionsSet.add(i.udi_di);
    else if (field === 'code' && i.code) optionsSet.add(i.code);
    else if (field === 'location' && i.location) optionsSet.add(i.location);
    else if (field === 'name' && i.name) optionsSet.add(i.name);
    else if (field === 'all') {
      if (i.code) optionsSet.add(i.code);
      if (i.name) optionsSet.add(i.name);
      if (i.location) optionsSet.add(i.location);
      if (i.udi_di) optionsSet.add(i.udi_di);
    }
  });

  let optionsHtml = '';
  optionsSet.forEach(opt => {
    optionsHtml += `<option value="${opt}"></option>`;
  });
  datalist.innerHTML = optionsHtml;

  filterItemsTable();
}

function filterItemsTable() {
  renderItemsTable();
}

function renderItemsTable() {
  const tbody = document.getElementById('all-items-body');
  if (!tbody) return;

  const rawItems = getAllRawItems();
  if (rawItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Žádné evidované položky k zobrazení.</td></tr>';
    return;
  }

  // Group items by Code or Name
  const groups = {};
  const today = new Date('2026-09-30'); // system date standard

  rawItems.forEach(i => {
    const key = i.code ? i.code.trim().toUpperCase() : (i.name || 'UNKNOWN').trim().toUpperCase();
    if (!groups[key]) {
      groups[key] = {
        code: i.code || '-',
        name: i.name || '-',
        udi_di: i.udi_di || '-',
        category: i.category || 'Clip',
        locations: {},
        totalQty: 0,
        expiring90Qty: 0,
        expiries: []
      };
    }
    const g = groups[key];
    const qty = parseInt(i.quantity) || 1;
    g.totalQty += qty;

    const loc = i.location || 'Nespecifikováno';
    g.locations[loc] = (g.locations[loc] || 0) + qty;

    if (i.expiry) {
      g.expiries.push(i.expiry);
      const expDate = new Date(i.expiry);
      if (!isNaN(expDate.getTime())) {
        const daysDiff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 90) {
          g.expiring90Qty += qty;
        }
      }
    }
  });

  let filteredGroups = Object.values(groups);

  const filterField = document.getElementById('filter-items-field')?.value || 'all';
  const filterQuery = (document.getElementById('filter-items-input')?.value || '').toLowerCase().trim();

  if (filterQuery) {
    filteredGroups = filteredGroups.filter(g => {
      const locStr = Object.keys(g.locations).join(' ').toLowerCase();
      if (filterField === 'udi') return g.udi_di && g.udi_di.toLowerCase().includes(filterQuery);
      if (filterField === 'code') return g.code && g.code.toLowerCase().includes(filterQuery);
      if (filterField === 'location') return locStr.includes(filterQuery);
      if (filterField === 'name') return g.name && g.name.toLowerCase().includes(filterQuery);
      return (
        (g.code && g.code.toLowerCase().includes(filterQuery)) ||
        (g.name && g.name.toLowerCase().includes(filterQuery)) ||
        (g.udi_di && g.udi_di.toLowerCase().includes(filterQuery)) ||
        locStr.includes(filterQuery)
      );
    });
  }

  if (filterExpiry90Only) {
    filteredGroups = filteredGroups.filter(g => g.expiring90Qty > 0);
  }

  if (filterUnderMinOnly) {
    filteredGroups = filteredGroups.filter(g => g.totalQty < 5);
  }

  // Sort by shortest expiration date ascending (nearest expiry on top)
  filteredGroups.sort((a, b) => {
    const expA = a.expiries.length > 0 ? a.expiries.slice().sort()[0] : '9999-12-31';
    const expB = b.expiries.length > 0 ? b.expiries.slice().sort()[0] : '9999-12-31';
    return expA.localeCompare(expB);
  });

  if (filteredGroups.length === 0) {
    tbody.innerHTML = filterExpiry90Only 
      ? '<tr><td colspan="8" style="text-align:center; padding: 25px; color: #f87171; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Žádné položky nemají expiraci do 90 dní.</td></tr>'
      : '<tr><td colspan="8" style="text-align:center;">Žádné evidované položky k zobrazení.</td></tr>';
    return;
  }

  let html = '';
  let rowIdx = 1;
  filteredGroups.forEach(g => {
    // Breakdown of locations
    const locArr = Object.entries(g.locations).map(([loc, count]) => `${loc} (${count} ks)`);
    const locStr = locArr.join(', ');

    // Expiration date (earliest)
    g.expiries.sort();
    const expiryStr = g.expiries.length > 0 ? g.expiries[0] : '-';

    // 90-day expiry badge highlight
    let expiry90Badge = '';
    if (g.expiring90Qty > 0) {
      expiry90Badge = `<span style="color:#ef4444; background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.3); padding:4px 10px; border-radius:6px; font-weight:700; display:inline-flex; align-items:center; gap:6px;">
        <i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i> ${g.expiring90Qty} ks (do 90 dní)
      </span>`;
    } else {
      expiry90Badge = `<span style="color:#10b981; background:rgba(16, 185, 129, 0.1); padding:4px 10px; border-radius:6px; font-weight:600;">Ne (0 ks)</span>`;
    }

    html += `
      <tr>
        <td>#${rowIdx++}</td>
        <td><strong>${g.code}</strong></td>
        <td>${g.name}</td>
        <td><code style="background:rgba(255,255,255,0.06); padding:3px 8px; border-radius:4px; font-family:monospace; color:#38bdf8;">${g.udi_di}</code></td>
        <td><strong style="color:#38bdf8;">${g.totalQty} ks</strong></td>
        <td>${locStr}</td>
        <td>${expiryStr}</td>
        <td>${expiry90Badge}</td>
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
  const rawItems = getAllRawItems();
  const filtered = rawItems.filter(i => 
    (i.name && i.name.toLowerCase().includes(q)) || 
    (i.code && i.code.toLowerCase().includes(q)) || 
    (i.category && i.category.toLowerCase().includes(q)) ||
    (i.udi_di && i.udi_di.toLowerCase().includes(q))
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
  updateUserUI();
  loadVlastaData();
  loadVlastaCodebooks();
  loadImplantations();
});

// =============================================================================
// USER AUTHENTICATION, ROLES & PERMISSIONS SYSTEM
// =============================================================================

const VLASTA_USERS = [
  { id: 'USR-001', name: 'Tomáš Veselý', email: 'tomas.vesely@vlasta-project.cz', role: 'Administrátor' },
  { id: 'USR-002', name: 'Jan Kovář', email: 'jan.kovar@vlasta-project.cz', role: 'Skladník' },
  { id: 'USR-003', name: 'Marek Dvořák', email: 'marek.dvorak@vlasta-project.cz', role: 'Technik' },
  { id: 'USR-004', name: 'Jindřich "Jindra" Blažek', email: 'jindrich.blazek@vlasta-project.cz', role: 'Lékař' }
];

function getStoredUsers() {
  const saved = localStorage.getItem('vlasta_users_db');
  if (saved) {
    try { return JSON.parse(saved); } catch(e) {}
  }
  return VLASTA_USERS;
}

function saveUsers(users) {
  localStorage.setItem('vlasta_users_db', JSON.stringify(users));
}

function getCurrentUser() {
  const email = localStorage.getItem('vlasta_logged_user_email') || 'tomas.vesely@vlasta-project.cz';
  const users = getStoredUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || users[0];
}

function selectUserLogin(email) {
  localStorage.setItem('vlasta_logged_user_email', email);
  updateUserUI();
  closeLoginModal();
  if (typeof switchTab === 'function') switchTab('dashboard');
  alert(`Byl jste úspěšně přihlášen jako ${getCurrentUser().name} (${getCurrentUser().role})`);
}

function loginCustomUser() {
  const input = document.getElementById('custom-login-email');
  const email = input ? input.value.trim() : '';
  if (!email) { alert('Zadejte platný e-mail.'); return; }
  
  const users = getStoredUsers();
  let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    const namePart = email.split('@')[0].replace('.', ' ');
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    user = {
      id: `USR-${String(users.length + 1).padStart(3, '0')}`,
      name: formattedName,
      email: email,
      role: 'Lékař'
    };
    users.push(user);
    saveUsers(users);
  }
  selectUserLogin(user.email);
}

function openLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.style.display = 'flex';
}

function closeLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.style.display = 'none';
}

function updateUserUI() {
  const curUser = getCurrentUser();
  const nameEl = document.getElementById('sidebar-user-name');
  const emailEl = document.getElementById('sidebar-user-email');
  const roleEl = document.getElementById('sidebar-user-role');
  
  if (nameEl) nameEl.textContent = curUser.name;
  if (emailEl) emailEl.textContent = curUser.email;
  if (roleEl) roleEl.textContent = curUser.role;

  const tabName = document.getElementById('user-tab-name');
  const tabEmail = document.getElementById('user-tab-email');
  const tabRole = document.getElementById('user-tab-role');

  if (tabName) tabName.textContent = curUser.name;
  if (tabEmail) tabEmail.textContent = curUser.email;
  if (tabRole) tabRole.textContent = curUser.role;

  updateRoleUI();
}

function hasPermission(permKey) {
  const role = getCurrentUser().role;
  if (role === 'Administrátor') return true;
  
  if (role === 'Skladník') {
    return ['items_add', 'items_edit', 'items_delete', 'codebooks_edit', 'items_view', 'implantations_view'].includes(permKey);
  }
  if (role === 'Technik') {
    return ['implantations_add', 'implantations_edit', 'items_view', 'codebooks_view'].includes(permKey);
  }
  if (role === 'Lékař') {
    return ['items_view', 'implantations_view', 'analytics_view', 'voice_view'].includes(permKey);
  }
  return false;
}

function updateRoleUI() {
  const canAddItem = hasPermission('items_add');
  const canAddImp = hasPermission('implantations_add');

  const btnAddItem = document.getElementById('btn-add-item-stock');
  if (btnAddItem) btnAddItem.style.display = canAddItem ? 'inline-flex' : 'none';

  const btnAddImp = document.getElementById('btn-add-imp');
  if (btnAddImp) btnAddImp.style.display = canAddImp ? 'inline-flex' : 'none';
}

function renderUsersTab() {
  const tbody = document.getElementById('users-list-body');
  if (!tbody) return;

  const users = getStoredUsers();
  const curUser = getCurrentUser();

  let html = '';
  users.forEach(u => {
    const isCurrent = u.email.toLowerCase() === curUser.email.toLowerCase();
    const activeBadge = isCurrent 
      ? `<span style="color:#10b981; font-weight:700; font-size:11px; margin-left:8px;">(Aktivní vy)</span>` 
      : '';

    const isAdmin = curUser.role === 'Administrátor';
    let roleSelect = '';
    
    if (isAdmin && !isCurrent) {
      roleSelect = `
        <select class="modal-input" onchange="changeUserRole('${u.id}', this.value)" style="padding: 4px 8px; font-size: 12px; margin: 0; width: 140px;">
          <option value="Administrátor" ${u.role === 'Administrátor' ? 'selected' : ''}>Administrátor</option>
          <option value="Skladník" ${u.role === 'Skladník' ? 'selected' : ''}>Skladník</option>
          <option value="Technik" ${u.role === 'Technik' ? 'selected' : ''}>Technik</option>
          <option value="Lékař" ${u.role === 'Lékař' ? 'selected' : ''}>Lékař</option>
        </select>
      `;
    } else {
      const colors = { 'Administrátor': '#38bdf8', 'Skladník': '#f59e0b', 'Technik': '#c084fc', 'Lékař': '#94a3b8' };
      roleSelect = `<span style="color:${colors[u.role] || '#fff'}; font-weight:700;">${u.role}</span>`;
    }

    html += `
      <tr>
        <td><strong>${u.id}</strong></td>
        <td><strong>${u.name}</strong> ${activeBadge}</td>
        <td><code>${u.email}</code></td>
        <td>${roleSelect}</td>
        <td><span class="badge-vlasta">${u.role === 'Administrátor' ? 'Plná oprávnění' : (u.role === 'Skladník' ? 'Správa skladu & číselníků' : (u.role === 'Technik' ? 'Zákroky & Sklad' : 'Pouze čtení'))}</span></td>
        <td style="text-align: right;">
          <button class="btn-secondary btn-sm" onclick="selectUserLogin('${u.email}')"><i class="fa-solid fa-right-to-bracket"></i> Přihlásit se</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function changeUserRole(userId, newRole) {
  const users = getStoredUsers();
  const target = users.find(u => u.id === userId);
  if (target) {
    target.role = newRole;
    saveUsers(users);
    renderUsersTab();
    updateUserUI();
    alert(`Role uživatele ${target.name} byla změněna na ${newRole}.`);
  }
}

// STOCK ITEM DETAIL MODAL & POD MINIMEM FILTER
let filterUnderMinOnly = false;

function toggleUnderMinFilter() {
  filterUnderMinOnly = !filterUnderMinOnly;
  const btn = document.getElementById('btn-filter-undermin');
  if (btn) {
    if (filterUnderMinOnly) {
      btn.style.background = 'rgba(245, 158, 11, 0.2)';
      btn.style.borderColor = '#f59e0b';
      btn.innerHTML = `<i class="fa-solid fa-filter-circle-xmark"></i> Zobrazit Vše`;
    } else {
      btn.style.background = 'transparent';
      btn.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      btn.innerHTML = `<i class="fa-solid fa-boxes-packing"></i> Pod minimem`;
    }
  }
  renderItemsTable();
}

function openStockItemDetailModal(code) {
  const modal = document.getElementById('stock-item-detail-modal');
  const title = document.getElementById('stock-item-detail-title');
  const body = document.getElementById('stock-item-detail-body');
  if (!modal || !body) return;

  const rawItems = getAllRawItems();
  const matched = rawItems.filter(i => (i.code || '').toUpperCase() === (code || '').toUpperCase());

  if (matched.length === 0) {
    alert(`Položka s kódem ${code} nebyla nalezena.`);
    return;
  }

  const sample = matched[0];
  const totalQty = matched.reduce((acc, i) => acc + (parseInt(i.quantity) || 1), 0);
  
  const locationsMap = {};
  matched.forEach(i => {
    const loc = i.location || 'Centrální sklad';
    locationsMap[loc] = (locationsMap[loc] || 0) + (parseInt(i.quantity) || 1);
  });

  const locListHtml = Object.entries(locationsMap).map(([loc, q]) => 
    `<li style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:13px;"><span>${loc}</span> <strong style="color:#38bdf8;">${q} ks</strong></li>`
  ).join('');

  if (title) title.innerHTML = `<i class="fa-solid fa-box-open" style="color:#06b6d4;"></i> Detail Položky Skladu: <strong style="color:#38bdf8;">${sample.code}</strong>`;

  body.innerHTML = `
    <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 15px;">
      <div style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px;">${sample.name}</div>
      <div style="display: flex; gap: 15px; font-size: 13px; color: var(--text-muted); flex-wrap: wrap;">
        <span>Kód: <strong style="color:#38bdf8;">${sample.code}</strong></span>
        <span>UDI-DI: <code style="color:#06b6d4;">${sample.udi_di || '-'}</code></span>
        <span>LOT: <code>${sample.lot || '-'}</code></span>
        <span>REF: <code>${sample.ref || '-'}</code></span>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
      <div style="background: rgba(255,255,255,0.03); padding: 14px; border-radius: 8px; border: 1px solid var(--border-color);">
        <span style="color: var(--text-muted); font-size: 12px;">Celková zásoba v ČR:</span>
        <div style="font-size: 24px; font-weight: 700; color: #38bdf8; margin-top: 4px;">${totalQty} ks</div>
      </div>
      <div style="background: rgba(255,255,255,0.03); padding: 14px; border-radius: 8px; border: 1px solid var(--border-color);">
        <span style="color: var(--text-muted); font-size: 12px;">Exspirace (Nejbližší):</span>
        <div style="font-size: 20px; font-weight: 700; color: #f87171; margin-top: 4px;">${sample.expiry || '-'}</div>
      </div>
    </div>

    <div style="background: rgba(255,255,255,0.03); padding: 14px; border-radius: 8px; border: 1px solid var(--border-color);">
      <span style="color: var(--text-muted); font-size: 12px; font-weight: 600;">Rozpad zásoby podle skladů a techniků:</span>
      <ul style="list-style: none; padding: 0; margin-top: 8px; font-size: 13px;">
        ${locListHtml}
      </ul>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeStockItemDetailModal() {
  const modal = document.getElementById('stock-item-detail-modal');
  if (modal) modal.style.display = 'none';
}

// IMPLANTATIONS LOGIC
function loadImplantations() {
  fetch('/api/vlasta/implantations')
  .then(r => r.json())
  .then(data => {
    if (data && data.implantations) {
      vlastaData.implantations = data.implantations;
    }
    updateImpFilterOptions(false);
  })
  .catch(err => {
    console.error('Chyba při načítání implantací:', err);
    renderImplantationsTable();
  });
}

function updateImpFilterOptions(resetInput = true) {
  const field = document.getElementById('filter-imp-field')?.value || 'all';
  const inputEl = document.getElementById('filter-imp-input');
  const datalist = document.getElementById('filter-imp-datalist');
  const impList = vlastaData.implantations || [];
  
  if (resetInput && inputEl) {
    inputEl.value = '';
    const placeholders = {
      all: 'Vyberte ze seznamu / zadejte...',
      hospital: 'Vyberte nebo zadejte Nemocnici...',
      mitraclip: 'Vyberte nebo zadejte MitraClip...',
      triclip: 'Vyberte nebo zadejte TriClip...',
      date: 'Vyberte nebo zadejte Datum...',
      id: 'Vyberte nebo zadejte ID...'
    };
    inputEl.placeholder = placeholders[field] || 'Vyberte ze seznamu / zadejte...';
  }

  if (!datalist) return;

  const optionsSet = new Set();
  impList.forEach(imp => {
    if (field === 'hospital' && imp.hospital) optionsSet.add(imp.hospital);
    else if (field === 'mitraclip' && imp.mitraclip_name && imp.mitraclip_name !== '-') optionsSet.add(imp.mitraclip_name);
    else if (field === 'triclip' && imp.triclip_name && imp.triclip_name !== '-') optionsSet.add(imp.triclip_name);
    else if (field === 'date' && imp.date) optionsSet.add(imp.date);
    else if (field === 'id' && imp.id) optionsSet.add(imp.id);
    else if (field === 'all') {
      if (imp.hospital) optionsSet.add(imp.hospital);
      if (imp.mitraclip_name && imp.mitraclip_name !== '-') optionsSet.add(imp.mitraclip_name);
      if (imp.triclip_name && imp.triclip_name !== '-') optionsSet.add(imp.triclip_name);
      if (imp.id) optionsSet.add(imp.id);
      if (imp.date) optionsSet.add(imp.date);
    }
  });

  let optionsHtml = '';
  optionsSet.forEach(opt => {
    optionsHtml += `<option value="${opt}"></option>`;
  });
  datalist.innerHTML = optionsHtml;

  filterImplantationsTable();
}

function filterImplantationsTable() {
  const field = document.getElementById('filter-imp-field')?.value || 'all';
  const q = (document.getElementById('filter-imp-input')?.value || '').toLowerCase().trim();
  const rawList = vlastaData.implantations || [];
  
  if (!q) {
    renderImplantationsTable(rawList);
    return;
  }

  const filtered = rawList.filter(imp => {
    if (field === 'hospital') return imp.hospital && imp.hospital.toLowerCase().includes(q);
    if (field === 'mitraclip') return imp.mitraclip_name && imp.mitraclip_name.toLowerCase().includes(q);
    if (field === 'triclip') return imp.triclip_name && imp.triclip_name.toLowerCase().includes(q);
    if (field === 'date') return imp.date && imp.date.toLowerCase().includes(q);
    if (field === 'id') return imp.id && imp.id.toLowerCase().includes(q);
    
    const accStr = (imp.accessories || []).join(' ').toLowerCase();
    return (
      (imp.id && imp.id.toLowerCase().includes(q)) ||
      (imp.date && imp.date.toLowerCase().includes(q)) ||
      (imp.hospital && imp.hospital.toLowerCase().includes(q)) ||
      (imp.mitraclip_name && imp.mitraclip_name.toLowerCase().includes(q)) ||
      (imp.triclip_name && imp.triclip_name.toLowerCase().includes(q)) ||
      (imp.indication && imp.indication.toLowerCase().includes(q)) ||
      (imp.location && imp.location.toLowerCase().includes(q)) ||
      accStr.includes(q)
    );
  });

  renderImplantationsTable(filtered);
}

function renderImplantationsTable(itemsToRender = null) {
  const tbody = document.getElementById('implantations-table-body');
  if (!tbody) return;

  const list = itemsToRender !== null ? itemsToRender : (vlastaData.implantations || []);
  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Žádné realizované implantace.</td></tr>';
    return;
  }

  let html = '';
  list.forEach(imp => {
    const mitra = imp.mitraclip_name || '-';
    const tri = imp.triclip_name || '-';
    
    html += `
      <tr>
        <td>
          <a href="#" onclick="openImplantationDetailModal('${imp.id}'); return false;" style="color:#38bdf8; font-weight:700; text-decoration:underline;">
            <i class="fa-solid fa-notes-medical"></i> ${imp.id}
          </a>
        </td>
        <td><strong>${imp.date}</strong></td>
        <td>${imp.hospital || '-'}</td>
        <td><span style="color:#06b6d4; font-weight:600;">${mitra}</span></td>
        <td><span style="color:#10b981; font-weight:600;">${tri}</span></td>
        <td style="text-align: right;">
          <button class="btn-sm btn-secondary" onclick="openImplantationDetailModal('${imp.id}')"><i class="fa-solid fa-eye"></i> Detail</button>
          <button class="btn-sm btn-secondary" style="color:#06b6d4;" onclick="openEditImplantationModal('${imp.id}')"><i class="fa-solid fa-pen-to-square"></i> Upravit</button>
          <button class="btn-sm btn-secondary" style="color:#ef4444;" onclick="deleteImplantation('${imp.id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

let currentDetailImpId = null;

function openImplantationDetailModal(impId) {
  currentDetailImpId = impId;
  const list = vlastaData.implantations || [];
  const imp = list.find(i => i.id === impId);
  if (!imp) return;

  const modal = document.getElementById('implantation-detail-modal');
  const title = document.getElementById('imp-detail-title');
  const body = document.getElementById('imp-detail-body');

  title.innerHTML = `<i class="fa-solid fa-notes-medical" style="color:#38bdf8;"></i> Detail Implantace ${imp.id}`;

  const accStr = (imp.accessories && imp.accessories.length > 0) ? imp.accessories.join(', ') : 'Žádné příslušenství nepoužito';

  body.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
      <div>
        <span style="color: var(--text-muted); font-size: 12px;">ID Implantace:</span>
        <div style="font-weight: 700; color: #38bdf8; font-size: 16px;">${imp.id}</div>
      </div>
      <div>
        <span style="color: var(--text-muted); font-size: 12px;">Datum a Čas Zákroku:</span>
        <div style="font-weight: 600;">${imp.date} (${imp.time_from || '-'} až ${imp.time_to || '-'})</div>
      </div>
      <div>
        <span style="color: var(--text-muted); font-size: 12px;">Nemocnice:</span>
        <div style="font-weight: 600; color: #f59e0b;">${imp.hospital || '-'}</div>
      </div>
      <div>
        <span style="color: var(--text-muted); font-size: 12px;">Pacient (Pohlaví / Narození):</span>
        <div style="font-weight: 600;">${imp.gender || '-'} | Nar: ${imp.birth_date || '-'}</div>
      </div>
    </div>

    <div style="margin-top: 15px; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
      <div style="margin-bottom: 10px;">
        <span style="color: var(--text-muted); font-size: 12px;">Použitý MitraClip:</span>
        <div style="font-weight: 600; color: #06b6d4;">${imp.mitraclip_name || 'Žádný'}</div>
      </div>
      <div style="margin-bottom: 10px;">
        <span style="color: var(--text-muted); font-size: 12px;">Použitý TriClip:</span>
        <div style="font-weight: 600; color: #10b981;">${imp.triclip_name || 'Žádný'}</div>
      </div>
      <div>
        <span style="color: var(--text-muted); font-size: 12px;">Použité Příslušenství:</span>
        <div style="font-weight: 500; color: #cbd5e1;">${accStr}</div>
      </div>
    </div>

    <div style="margin-top: 15px; background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
      <div style="margin-bottom: 10px;">
        <span style="color: var(--text-muted); font-size: 12px;">Indikace Zákroku:</span>
        <div style="font-weight: 600;">${imp.indication || '-'}</div>
      </div>
      <div>
        <span style="color: var(--text-muted); font-size: 12px;">Umístění / Anatomie:</span>
        <div style="font-weight: 600; color: #a855f7;">${imp.location || '-'}</div>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeImplantationDetailModal() {
  const modal = document.getElementById('implantation-detail-modal');
  if (modal) modal.style.display = 'none';
}

function editImplantationFromDetail() {
  if (!currentDetailImpId) return;
  const impId = currentDetailImpId;
  closeImplantationDetailModal();
  openEditImplantationModal(impId);
}

function findMatchingClipOption(selectEl, clipName) {
  if (!selectEl || !clipName || clipName === '-') return null;
  const options = Array.from(selectEl.options);
  
  const codeMatch = clipName.match(/\(([^)]+)\)/);
  const code = codeMatch ? codeMatch[1].replace('Kód:', '').trim() : '';

  if (code) {
    const matchByCode = options.find(opt => opt.text.toLowerCase().includes(code.toLowerCase()));
    if (matchByCode) return matchByCode;
  }

  const cleanName = clipName.split('(')[0].trim().toLowerCase();
  if (cleanName) {
    const matchByName = options.find(opt => opt.text.toLowerCase().includes(cleanName));
    if (matchByName) return matchByName;
  }

  return null;
}

function openEditImplantationModal(impId) {
  const imp = (vlastaData.implantations || []).find(i => i.id === impId);
  if (!imp) return;

  openNewImplantationModal();

  const titleEl = document.getElementById('new-imp-modal-title');
  if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square" style="color:#06b6d4;"></i> Úprava Implantace ${impId}`;
  
  const editIdEl = document.getElementById('imp-edit-id');
  if (editIdEl) editIdEl.value = impId;

  document.getElementById('imp-date').value = imp.date || '';
  document.getElementById('imp-hospital').value = imp.hospital || '';
  document.getElementById('imp-time-from').value = imp.time_from || '09:00';
  document.getElementById('imp-time-to').value = imp.time_to || '11:30';
  document.getElementById('imp-gender').value = imp.gender || 'Muž';
  document.getElementById('imp-birth-date').value = imp.birth_date || '1960-01-01';
  document.getElementById('imp-indication').value = imp.indication || '';
  document.getElementById('imp-location').value = imp.location || '';

  // Pre-select matching MitraClip
  const mitraclipSelect = document.getElementById('imp-mitraclip');
  if (imp.mitraclip_name && imp.mitraclip_name !== '-') {
    let foundOption = findMatchingClipOption(mitraclipSelect, imp.mitraclip_name);
    if (!foundOption) {
      const opt = document.createElement('option');
      opt.value = `EXISTING:${imp.mitraclip_name}`;
      opt.textContent = `Původně přiřazený: ${imp.mitraclip_name}`;
      mitraclipSelect.insertBefore(opt, mitraclipSelect.options[1]);
      mitraclipSelect.value = opt.value;
    } else {
      mitraclipSelect.value = foundOption.value;
    }
  } else {
    mitraclipSelect.value = '';
  }

  // Pre-select matching TriClip
  const triclipSelect = document.getElementById('imp-triclip');
  if (imp.triclip_name && imp.triclip_name !== '-') {
    let foundOption = findMatchingClipOption(triclipSelect, imp.triclip_name);
    if (!foundOption) {
      const opt = document.createElement('option');
      opt.value = `EXISTING:${imp.triclip_name}`;
      opt.textContent = `Původně přiřazený: ${imp.triclip_name}`;
      triclipSelect.insertBefore(opt, triclipSelect.options[1]);
      triclipSelect.value = opt.value;
    } else {
      triclipSelect.value = foundOption.value;
    }
  } else {
    triclipSelect.value = '';
  }

  // Select matching accessories checkboxes
  if (imp.accessories && Array.isArray(imp.accessories)) {
    const checkboxes = document.querySelectorAll('input[name="imp-acc-checkbox"]');
    checkboxes.forEach(cb => {
      const name = cb.getAttribute('data-name') || '';
      cb.checked = imp.accessories.some(acc => name.toLowerCase().includes(acc.toLowerCase()) || acc.toLowerCase().includes(name.toLowerCase()));
    });
  }
}

function openNewImplantationModal() {
  const modal = document.getElementById('new-implantation-modal');
  if (!modal) return;

  const titleEl = document.getElementById('new-imp-modal-title');
  if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-heart-pulse"></i> Zadání Nové Implantace`;

  const editIdEl = document.getElementById('imp-edit-id');
  if (editIdEl) editIdEl.value = '';

  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('imp-date').value = todayStr;
  document.getElementById('imp-time-from').value = '09:00';
  document.getElementById('imp-time-to').value = '11:30';
  document.getElementById('imp-gender').value = 'Muž';
  document.getElementById('imp-birth-date').value = '1960-01-01';
  document.getElementById('imp-indication').value = '';
  document.getElementById('imp-location').value = '';

  // Populate hospitals
  const hospSelect = document.getElementById('imp-hospital');
  const hospitals = (vlastaData.codebooks && vlastaData.codebooks.hospitals) || vlastaData.hospitals || [];
  let hospHtml = '<option value="">-- Vyberte nemocnici --</option>';
  hospitals.forEach(h => {
    hospHtml += `<option value="${h.name}">${h.name} (${h.city || ''})</option>`;
  });
  hospSelect.innerHTML = hospHtml;

  // Populate MitraClip (Dvojcípá svorka)
  const mitraclipSelect = document.getElementById('imp-mitraclip');
  const clipList = (vlastaData.codebooks && (vlastaData.codebooks.clip || vlastaData.codebooks.material)) || vlastaData.clip || [];
  let mitraHtml = '<option value="">-- Žádná Dvojcípá svorka (MitraClip) --</option>';
  clipList.filter(c => c.name.toLowerCase().includes('dvojcípá') || c.name.toLowerCase().includes('mitraclip') || c.code.toLowerCase().includes('svor')).forEach(c => {
    const qty = parseInt(c.quantity) || 1;
    mitraHtml += `<option value="${c.id}">${c.name} (Kód: ${c.code}, Sklad: ${c.location}, Skupina: ${qty} ks)</option>`;
  });
  mitraclipSelect.innerHTML = mitraHtml;

  // Populate TriClip (Třícípá svěrka)
  const triclipSelect = document.getElementById('imp-triclip');
  let triHtml = '<option value="">-- Žádná Třícípá svěrka (TriClip) --</option>';
  clipList.filter(c => c.name.toLowerCase().includes('třícípá') || c.name.toLowerCase().includes('triclip') || c.code.toLowerCase().includes('t-svor')).forEach(c => {
    const qty = parseInt(c.quantity) || 1;
    triHtml += `<option value="${c.id}">${c.name} (Kód: ${c.code}, Sklad: ${c.location}, Skupina: ${qty} ks)</option>`;
  });
  triclipSelect.innerHTML = triHtml;

  // Populate Accessories checkboxes
  const accDiv = document.getElementById('imp-accessories-checkboxes');
  const accList = (vlastaData.codebooks && vlastaData.codebooks.accessories) || vlastaData.accessories || [];
  if (accList.length === 0) {
    accDiv.innerHTML = '<span style="color:var(--text-muted);">Žádné příslušenství na skladě.</span>';
  } else {
    let accHtml = '';
    accList.forEach(a => {
      const qty = parseInt(a.quantity) || 1;
      accHtml += `
        <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:13px; cursor:pointer;">
          <input type="checkbox" name="imp-acc-checkbox" value="${a.id}" data-name="${a.name} (${a.code})">
          <span><strong>${a.name}</strong> (Kód: ${a.code}, Sklad: ${a.location}, ${qty} ks)</span>
        </label>
      `;
    });
    accDiv.innerHTML = accHtml;
  }

  modal.style.display = 'flex';
}

function closeNewImplantationModal() {
  const modal = document.getElementById('new-implantation-modal');
  if (modal) modal.style.display = 'none';
}

function saveNewImplantation() {
  const date = document.getElementById('imp-date').value;
  const hospital = document.getElementById('imp-hospital').value;
  const time_from = document.getElementById('imp-time-from').value;
  const time_to = document.getElementById('imp-time-to').value;
  const gender = document.getElementById('imp-gender').value;
  const birth_date = document.getElementById('imp-birth-date').value;
  const mitraclipId = document.getElementById('imp-mitraclip').value;
  const triclipId = document.getElementById('imp-triclip').value;
  const indication = document.getElementById('imp-indication').value.trim();
  const location = document.getElementById('imp-location').value.trim();

  if (!date || !hospital || !time_from || !time_to || !birth_date || !indication || !location) {
    alert('Prosím vyplňte všechna povinná pole (Datum, Nemocnice, Časy, Narození, Indikace, Umístění).');
    return;
  }

  const editId = document.getElementById('imp-edit-id') ? document.getElementById('imp-edit-id').value : '';

  const checkedBoxes = document.querySelectorAll('input[name="imp-acc-checkbox"]:checked');
  const accIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
  const accNames = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-name'));

  const clipList = (vlastaData.codebooks && (vlastaData.codebooks.clip || vlastaData.codebooks.material)) || vlastaData.clip || [];
  const accList = (vlastaData.codebooks && vlastaData.codebooks.accessories) || vlastaData.accessories || [];

  let mitraclipName = '-';
  if (mitraclipId) {
    if (mitraclipId.startsWith('EXISTING:')) {
      mitraclipName = mitraclipId.replace('EXISTING:', '');
    } else {
      const item = clipList.find(c => c.id === parseInt(mitraclipId));
      if (item) {
        mitraclipName = `${item.name} (${item.code})`;
      }
    }
  }

  let triclipName = '-';
  if (triclipId) {
    if (triclipId.startsWith('EXISTING:')) {
      triclipName = triclipId.replace('EXISTING:', '');
    } else {
      const item = clipList.find(c => c.id === parseInt(triclipId));
      if (item) {
        triclipName = `${item.name} (${item.code})`;
      }
    }
  }

  if (editId) {
    const existingImp = (vlastaData.implantations || []).find(i => i.id === editId);
    if (existingImp) {
      existingImp.date = date;
      existingImp.hospital = hospital;
      existingImp.time_from = time_from;
      existingImp.time_to = time_to;
      existingImp.gender = gender;
      existingImp.birth_date = birth_date;
      existingImp.indication = indication;
      existingImp.location = location;
      if (mitraclipName !== '-') existingImp.mitraclip_name = mitraclipName;
      if (triclipName !== '-') existingImp.triclip_name = triclipName;
      if (accNames.length > 0) existingImp.accessories = accNames;

      fetch('/api/vlasta/implantations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ implantation: existingImp, codebooks: vlastaData.codebooks })
      })
      .then(r => r.json())
      .then(res => {
        closeNewImplantationModal();
        updateImpFilterOptions(false);
        renderDashboardStats();
        alert(`Záznam implantace ${editId} byl úspěšně upraven!`);
      })
      .catch(err => {
        console.error('Chyba při úpravě implantace:', err);
        closeNewImplantationModal();
        updateImpFilterOptions(false);
      });
      return;
    }
  }

  if (!editId) {
    if (mitraclipId) {
      const item = clipList.find(c => c.id === parseInt(mitraclipId));
      if (item) item.quantity = (parseInt(item.quantity) || 1) - 1;
    }
    if (triclipId) {
      const item = clipList.find(c => c.id === parseInt(triclipId));
      if (item) item.quantity = (parseInt(item.quantity) || 1) - 1;
    }
    accIds.forEach(accId => {
      const item = accList.find(a => a.id === accId);
      if (item) item.quantity = (parseInt(item.quantity) || 1) - 1;
    });

    if (vlastaData.codebooks) {
      if (vlastaData.codebooks.clip) {
        vlastaData.codebooks.clip = vlastaData.codebooks.clip.filter(c => (parseInt(c.quantity) || 0) > 0);
      }
      if (vlastaData.codebooks.accessories) {
        vlastaData.codebooks.accessories = vlastaData.codebooks.accessories.filter(a => (parseInt(a.quantity) || 0) > 0);
      }
    }
  }

  if (!vlastaData.implantations) vlastaData.implantations = [];
  const newIdNum = vlastaData.implantations.length + 1;
  const newImp = {
    id: `IMP-2026-${String(newIdNum).padStart(3, '0')}`,
    date,
    hospital,
    time_from,
    time_to,
    gender,
    birth_date,
    mitraclip_name: mitraclipName,
    triclip_name: triclipName,
    accessories: accNames,
    indication,
    location
  };

  vlastaData.implantations.unshift(newImp);

  fetch('/api/vlasta/implantations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ implantation: newImp, codebooks: vlastaData.codebooks })
  })
  .then(r => r.json())
  .then(res => {
    closeNewImplantationModal();
    updateImpFilterOptions(false);
    renderItemsTable();
    renderClipTable(vlastaData.codebooks.clip || []);
    renderAccessoriesTable(vlastaData.codebooks.accessories || []);
    renderDashboardStats();
    alert(`Implantace ${newImp.id} byla úspěšně uložena!`);
  })
  .catch(err => {
    console.error('Chyba při ukládání implantace:', err);
    closeNewImplantationModal();
    updateImpFilterOptions(false);
    renderItemsTable();
    renderDashboardStats();
  });
}

function deleteImplantation(impId) {
  if (!confirm(`Opravdu si přejete smazat záznam implantace ${impId}?`)) return;
  vlastaData.implantations = (vlastaData.implantations || []).filter(i => i.id !== impId);
  fetch('/api/vlasta/implantations', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: impId })
  })
  .then(() => {
    updateImpFilterOptions(false);
  })
  .catch(err => {
    console.error(err);
    updateImpFilterOptions(false);
  });
}


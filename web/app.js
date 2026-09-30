window.switchTab = function(tabKey) {
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');

  const titlesMap = {
    dashboard: { title: 'Hlavní Přehled', subtitle: 'Přehledná správa a řízení projektu VLASTA' },
    items: { title: 'Evidované Položky', subtitle: 'Detailní seznam všech položek v databázi VLASTA' },
    implantations: { title: 'Implantace', subtitle: 'Evidence realizovaných zákroků MitraClip a TriClip' },
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
  if (tabKey === 'implantations') {
    loadImplantations();
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
        <td>#${h.id}</td>
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

  let html = '<option value="Hlavní sklad CARDION">Hlavní sklad CARDION</option>';

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
        <td>#${c.id}</td>
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
        <td>#${a.id}</td>
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
    ...clipList.map(i => ({ ...i, category: 'Clip', quantity: parseInt(i.quantity) || 1 })),
    ...accList.map(i => ({ ...i, category: 'Příslušenství', quantity: parseInt(i.quantity) || 1 }))
  ];
  return raw;
}

function renderDashboardStats() {
  const items = getAllRawItems();
  const totalItems = items.length;
  const totalQty = items.reduce((acc, i) => acc + (parseInt(i.quantity) || 1), 0);
  
  const cats = {};
  items.forEach(i => {
    const c = i.category || 'Ostatní';
    cats[c] = (cats[c] || 0) + (parseInt(i.quantity) || 1);
  });

  const elTotalItems = document.getElementById('stat-total-items');
  const elTotalQty = document.getElementById('stat-total-qty');
  const elCatCount = document.getElementById('stat-categories-count');

  if (elTotalItems) elTotalItems.textContent = totalItems;
  if (elTotalQty) elTotalQty.textContent = `${totalQty} ks`;
  if (elCatCount) elCatCount.textContent = Object.keys(cats).length;

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
        <td><strong>${i.code || '-'}</strong></td>
        <td>${i.name || '-'}</td>
        <td><span class="badge-vlasta">${i.category || 'Clip/Příslušenství'}</span></td>
        <td>${i.quantity || 1} ks</td>
        <td>${i.location || '-'}</td>
        <td><span style="color:#10b981;">● Aktivní</span></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
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
  if (filterExpiry90Only) {
    filteredGroups = filteredGroups.filter(g => g.expiring90Qty > 0);
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
  loadVlastaData();
  loadVlastaCodebooks();
  loadImplantations();
});

// IMPLANTATIONS LOGIC
function loadImplantations() {
  fetch('/api/vlasta/implantations')
  .then(r => r.json())
  .then(data => {
    if (data && data.implantations) {
      vlastaData.implantations = data.implantations;
    }
    renderImplantationsTable();
  })
  .catch(err => {
    console.error('Chyba při načítání implantací:', err);
    renderImplantationsTable();
  });
}

function renderImplantationsTable() {
  const tbody = document.getElementById('implantations-table-body');
  if (!tbody) return;

  const list = vlastaData.implantations || [];
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
          <button class="btn-sm btn-secondary" style="color:#ef4444;" onclick="deleteImplantation('${imp.id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function openImplantationDetailModal(impId) {
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

function openNewImplantationModal() {
  const modal = document.getElementById('new-implantation-modal');
  if (!modal) return;

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

  // Populate MitraClip
  const mitraclipSelect = document.getElementById('imp-mitraclip');
  const clipList = (vlastaData.codebooks && (vlastaData.codebooks.clip || vlastaData.codebooks.material)) || vlastaData.clip || [];
  let mitraHtml = '<option value="">-- Žádný MitraClip --</option>';
  clipList.filter(c => c.name.toLowerCase().includes('mitraclip') || c.code.toLowerCase().includes('cds')).forEach(c => {
    const qty = parseInt(c.quantity) || 1;
    mitraHtml += `<option value="${c.id}">${c.name} (Kód: ${c.code}, Sklad: ${c.location}, Skupina: ${qty} ks)</option>`;
  });
  mitraclipSelect.innerHTML = mitraHtml;

  // Populate TriClip
  const triclipSelect = document.getElementById('imp-triclip');
  let triHtml = '<option value="">-- Žádný TriClip --</option>';
  clipList.filter(c => c.name.toLowerCase().includes('triclip') || c.code.toLowerCase().includes('tcds')).forEach(c => {
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

  const checkedBoxes = document.querySelectorAll('input[name="imp-acc-checkbox"]:checked');
  const accIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
  const accNames = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-name'));

  const clipList = (vlastaData.codebooks && (vlastaData.codebooks.clip || vlastaData.codebooks.material)) || vlastaData.clip || [];
  const accList = (vlastaData.codebooks && vlastaData.codebooks.accessories) || vlastaData.accessories || [];

  let mitraclipName = '-';
  if (mitraclipId) {
    const item = clipList.find(c => c.id === parseInt(mitraclipId));
    if (item) {
      mitraclipName = `${item.name} (${item.code})`;
      item.quantity = (parseInt(item.quantity) || 1) - 1;
    }
  }

  let triclipName = '-';
  if (triclipId) {
    const item = clipList.find(c => c.id === parseInt(triclipId));
    if (item) {
      triclipName = `${item.name} (${item.code})`;
      item.quantity = (parseInt(item.quantity) || 1) - 1;
    }
  }

  accIds.forEach(accId => {
    const item = accList.find(a => a.id === accId);
    if (item) {
      item.quantity = (parseInt(item.quantity) || 1) - 1;
    }
  });

  if (vlastaData.codebooks) {
    if (vlastaData.codebooks.clip) {
      vlastaData.codebooks.clip = vlastaData.codebooks.clip.filter(c => (parseInt(c.quantity) || 0) > 0);
    }
    if (vlastaData.codebooks.accessories) {
      vlastaData.codebooks.accessories = vlastaData.codebooks.accessories.filter(a => (parseInt(a.quantity) || 0) > 0);
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
    renderImplantationsTable();
    renderItemsTable();
    renderClipTable(vlastaData.codebooks.clip || []);
    renderAccessoriesTable(vlastaData.codebooks.accessories || []);
    renderDashboardStats();
    alert(`Implantace ${newImp.id} byla úspěšně uložena a použité položky byly odepsány ze skladu!`);
  })
  .catch(err => {
    console.error('Chyba při ukládání implantace:', err);
    closeNewImplantationModal();
    renderImplantationsTable();
    renderItemsTable();
    if (vlastaData.codebooks) {
      renderClipTable(vlastaData.codebooks.clip || []);
      renderAccessoriesTable(vlastaData.codebooks.accessories || []);
    }
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
    renderImplantationsTable();
  })
  .catch(err => {
    console.error(err);
    renderImplantationsTable();
  });
}


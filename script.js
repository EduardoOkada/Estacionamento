// Iguatemi Smart Parking · protótipo web
const $ = (s) => document.querySelector(s);
const screens = [...document.querySelectorAll('.screen')];
const navButtons = [...document.querySelectorAll('.bottom-nav button')];
const requestForm = $('#request-form');
const dateInput = $('#date');
const timeInput = $('#time');
const plateInput = $('#plate');
const formError = $('#form-error');
const mapGrid = $('#map-grid');
const selectedSpotEl = $('#selected-spot');
const selectionSummary = $('#selection-summary');
const confirmMapButton = $('#confirm-map');
const autoLoading = $('#auto-loading');
const autoFound = $('#auto-found');
const autoNote = $('#auto-note');
const autoResult = $('#auto-result');
const backButton = $('#back-btn');
const srStatus = $('#sr-status');

const PRICE = { valet: 18, saving: 12 }; // valores ilustrativos do protótipo
const FLOOR_DATA = {
  B1: { label: 'Piso B1', spots: Array.from({ length: 16 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`), occupied: new Set(['A01', 'A04', 'A07', 'A10', 'A13', 'A16']) },
  B2: { label: 'Piso B2', spots: Array.from({ length: 16 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`), occupied: new Set(['A02', 'A05', 'A08', 'A11', 'A14']) },
  B3: { label: 'Piso B3', spots: Array.from({ length: 16 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`), occupied: new Set(['A03', 'A06', 'A09', 'A12', 'A15']) },
  B4: { label: 'Piso B4', spots: Array.from({ length: 16 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`), occupied: new Set(['A01', 'A05', 'A10', 'A13', 'A16']) }
};
const FLOOR_ORDER = ['B1', 'B2', 'B3', 'B4'];
const TITLES = { request: 'Reserva antecipada', preference: 'Escolha como estacionar', map: 'Mapa de vagas', auto: 'Indicação automática', confirmation: 'Reserva confirmada' };
const STORE_KEY = 'iguatemi-smart-parking';

const state = { screen: 'request', history: ['request'], formDone: false, selected: null, reservation: null, reserved: new Set(), plate: '', floor: 'B1' };
let autoTimer;

/* ---------- persistência (opcional, falha em silêncio) ---------- */
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ reservation: state.reservation, reserved: [...state.reserved], plate: state.plate })); } catch (e) { /* ignora */ }
}
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (!data) return;
    state.reservation = data.reservation || null;
    state.reserved = new Set(data.reserved || []);
    state.plate = data.plate || '';
  } catch (e) { /* ignora */ }
}

/* ---------- utilidades ---------- */
const pad = (n) => String(n).padStart(2, '0');
const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatDate = (v) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${v}T12:00:00`));
const formatTime = (v) => { const [h, m] = v.split(':').map(Number); return new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, h, m)); };

function setDefaults() {
  const now = new Date();
  const next = new Date(now.getTime());
  next.setMinutes(now.getMinutes() < 30 ? 30 : 60, 0, 0); // próxima meia hora
  dateInput.min = localISO(now);
  dateInput.value = localISO(next);
  timeInput.value = `${pad(next.getHours())}:${pad(next.getMinutes())}`;
}

function normalizePlate(value) {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  return raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
}
const validPlate = (v) => /^[A-Z]{3}-[0-9][A-Z0-9][0-9]{2}$/.test(v);

function announce(text) { srStatus.textContent = ''; window.setTimeout(() => { srStatus.textContent = text; }, 50); }

/* ---------- navegação ---------- */
function showScreen(name, { push = true, reset = false } = {}) {
  const target = document.querySelector(`[data-screen="${name}"]`);
  if (!target) return;
  if (name !== 'auto') { clearTimeout(autoTimer); }
  if (reset) state.history = ['request'];
  if (push && state.history[state.history.length - 1] !== name) state.history.push(name);
  state.screen = name;

  screens.forEach((s) => s.classList.toggle('active', s === target));
  navButtons.forEach((b) => {
    const on = b.dataset.nav === name;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  backButton.hidden = name === 'request';
  target.scrollTo({ top: 0 });

  const heading = target.querySelector('h1, h2');
  if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
  announce(TITLES[name] || '');
  if (name === 'auto') startAuto();
}

function goBack() {
  if (state.history.length > 1) state.history.pop();
  showScreen(state.history[state.history.length - 1], { push: false });
}

/* ---------- mapa de vagas ---------- */
function getCurrentFloor() {
  return FLOOR_DATA[state.floor];
}

function getFullSpotId(spot) {
  return `${state.floor}-${spot}`;
}

function formatSpotLabel(spotId) {
  if (!spotId) return '—';
  const [, spot] = spotId.split('-');
  return `${spotId.split('-')[0]} - ${spot}`;
}

function spotStatus(id) {
  const fullId = getFullSpotId(id);
  if (state.reserved.has(fullId)) return 'reserved';
  if (getCurrentFloor().occupied.has(id)) return 'occupied';
  return 'available';
}
const STATUS_LABEL = { available: 'disponível', occupied: 'ocupada', reserved: 'reservada' };
const MARK = { available: '✓', occupied: '✕', reserved: '●' };

function updateFloorTabs() {
  document.querySelectorAll('.floor-tab').forEach((tab) => {
    const isActive = tab.dataset.floor === state.floor;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-pressed', String(isActive));
  });

  const floorLabel = document.getElementById('current-floor-label');
  if (floorLabel) floorLabel.textContent = getCurrentFloor().label;
  document.getElementById('map-grid').setAttribute('aria-label', `Mapa das vagas do ${getCurrentFloor().label}`);
}

function renderMap() {
  updateFloorTabs();
  mapGrid.innerHTML = '';
  const currentFloor = getCurrentFloor();

  currentFloor.spots.forEach((id) => {
    const status = spotStatus(id);
    const btn = document.createElement('button');
    const fullId = getFullSpotId(id);
    btn.type = 'button';
    btn.className = `map-entry ${status}${state.selected === fullId ? ' selected' : ''}`;
    btn.dataset.spot = fullId;
    btn.setAttribute('aria-label', `Vaga ${id}, ${STATUS_LABEL[status]}`);
    if (status === 'available') btn.setAttribute('aria-pressed', String(state.selected === fullId)); else btn.disabled = true;
    btn.innerHTML = `<span>${id}</span><span class="mark" aria-hidden="true">${MARK[status]}</span>`;
    mapGrid.appendChild(btn);
  });

  const hasSel = Boolean(state.selected && state.selected.startsWith(`${state.floor}-`));
  selectionSummary.hidden = !hasSel;
  selectedSpotEl.textContent = hasSel ? formatSpotLabel(state.selected) : '—';
  confirmMapButton.disabled = !hasSel;
}

mapGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.map-entry.available');
  if (!btn) return;
  state.selected = btn.dataset.spot;
  renderMap();
  mapGrid.querySelector(`[data-spot="${state.selected}"]`).focus();
});

FLOOR_ORDER.forEach((floorKey) => {
  const tab = document.querySelector(`.floor-tab[data-floor="${floorKey}"]`);
  if (!tab) return;
  tab.addEventListener('click', () => {
    state.floor = floorKey;
    state.selected = null;
    renderMap();
    document.getElementById('selection-summary').hidden = true;
    confirmMapButton.disabled = true;
    announce(`${FLOOR_DATA[floorKey].label} selecionado`);
  });
});

/* ---------- indicação automática ---------- */
function startAuto() {
  clearTimeout(autoTimer);
  autoLoading.hidden = false;
  autoFound.hidden = true;
  autoResult.hidden = true;
  autoTimer = window.setTimeout(() => {
    const free = getCurrentFloor().spots.find((id) => spotStatus(id) === 'available');
    autoLoading.hidden = true;
    autoFound.hidden = false;
    if (free) {
      state.selected = getFullSpotId(free);
      $('#auto-spot').textContent = formatSpotLabel(state.selected);
      autoNote.textContent = 'Melhor vaga disponível no momento (simulação do protótipo).';
      autoResult.hidden = false;
      announce(`Vaga indicada: ${formatSpotLabel(state.selected)}`);
    } else {
      $('#auto-spot').textContent = 'Sem vagas';
      autoNote.textContent = 'Não há vagas disponíveis para este horário. Tente outro horário.';
      announce('Sem vagas disponíveis');
    }
  }, 2200);
}

/* ---------- reserva ---------- */
function reserve(spot) {
  if (state.reservation) state.reserved.delete(state.reservation.spot); // uma reserva ativa por vez: a nova substitui a anterior
  state.reservation = {
    shopping: $('#shopping').value,
    date: dateInput.value,
    time: timeInput.value,
    plate: state.plate,
    spot,
  };
  state.reserved.add(spot);
  state.selected = null;
  save();
  renderSummary();
  renderMap();
  state.history = ['request'];
  showScreen('confirmation');
}

function renderSummary() {
  const r = state.reservation;
  const nav = document.querySelector('[data-nav="confirmation"]');
  nav.disabled = !r;
  nav.setAttribute('aria-disabled', String(!r));
  if (!r) return;
  $('#summary-shopping').textContent = r.shopping;
  $('#summary-date').textContent = `${formatDate(r.date)} · ${formatTime(r.time)}`;
  $('#summary-spot').textContent = r.spot;
  $('#summary-plate').textContent = r.plate;
  $('#price-valet').textContent = brl(PRICE.valet);
  $('#price-save').textContent = brl(PRICE.saving);
  $('#price-pay').textContent = brl(PRICE.valet - PRICE.saving);
}

/* ---------- eventos ---------- */
plateInput.addEventListener('input', () => { plateInput.value = normalizePlate(plateInput.value); });

requestForm.addEventListener('submit', (e) => {
  e.preventDefault();
  formError.hidden = true;
  const errors = [];
  if (!dateInput.value || !timeInput.value) errors.push('Informe a data e o horário de chegada.');
  else if (new Date(`${dateInput.value}T${timeInput.value}`) < new Date()) errors.push('O horário de chegada precisa ser a partir de agora.');
  if (!validPlate(plateInput.value)) errors.push('Informe a placa no formato ABC-1D23 ou ABC-1234.');
  if (errors.length) { formError.textContent = errors[0]; formError.hidden = false; return; }
  state.plate = plateInput.value;
  state.formDone = true;
  state.selected = null;
  renderMap();
  showScreen('preference');
});

document.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => showScreen(b.dataset.action)));
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', goBack));
backButton.addEventListener('click', goBack);

confirmMapButton.addEventListener('click', () => { if (state.selected) reserve(state.selected); });
autoResult.addEventListener('click', () => { if (state.selected) reserve(state.selected); });

navButtons.forEach((b) => b.addEventListener('click', () => {
  const t = b.dataset.nav;
  if (b.disabled) return;
  if (t === 'request') showScreen('request', { reset: true });
  if (t === 'map') {
    if (!state.formDone) { showScreen('request', { reset: true }); formError.textContent = 'Preencha os dados da reserva para ver o mapa.'; formError.hidden = false; return; }
    showScreen('map');
  }
  if (t === 'confirmation' && state.reservation) { state.history = ['request']; showScreen('confirmation'); }
}));

$('#cancel-reservation').addEventListener('click', () => {
  if (!state.reservation) return;
  if (!window.confirm('Cancelar esta reserva? A vaga será liberada.')) return;
  state.reserved.delete(state.reservation.spot);
  state.reservation = null;
  save();
  renderSummary();
  renderMap();
  showScreen('request', { reset: true });
  announce('Reserva cancelada');
});

$('#new-reservation').addEventListener('click', () => {
  setDefaults();
  state.formDone = false;
  state.selected = null;
  formError.hidden = true;
  renderMap();
  showScreen('request', { reset: true });
});

/* ---------- início ---------- */
load();
setDefaults();
plateInput.value = state.plate;
renderMap();
renderSummary();
if (state.reservation) showScreen('confirmation', { push: false });

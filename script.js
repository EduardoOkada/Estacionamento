const screens = [...document.querySelectorAll('.screen')];
const navButtons = [...document.querySelectorAll('.bottom-nav button')];
const requestForm = document.querySelector('#request-form');
const dateInput = document.querySelector('#date');
const timeInput = document.querySelector('#time');
const selectedSpot = document.querySelector('#selected-spot');
const confirmMapButton = document.querySelector('#confirm-map');
const selectionSummary = document.querySelector('#selection-summary');
const autoResult = document.querySelector('#auto-result');
const autoScreen = document.querySelector('#auto-screen');

let currentSpot = 'B1-A12';
let activeScreen = 'request';

function setDateMinimum() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
  dateInput.min = localDate;
  dateInput.value = localDate;
}

function showScreen(name) {
  const target = document.querySelector(`[data-screen="${name}"]`);
  if (!target) return;

  screens.forEach((screen) => screen.classList.toggle('active', screen === target));
  activeScreen = name;
  navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.nav === name);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function formatTime(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hours, minutes));
}

function updateSummary() {
  const shopping = document.querySelector('#shopping').value;
  const date = formatDate(dateInput.value);
  const time = formatTime(timeInput.value);

  document.querySelector('#summary-shopping').textContent = shopping;
  document.querySelector('#summary-date').textContent = `${date} · ${time}`;
  document.querySelector('#summary-spot').textContent = currentSpot;
}

requestForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!requestForm.reportValidity()) return;
  showScreen('preference');
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    showScreen(button.dataset.action);
  });
});

document.querySelectorAll('[data-back]').forEach((button) => {
  button.addEventListener('click', () => showScreen(button.dataset.back));
});

document.querySelectorAll('.map-entry.available').forEach((entry) => {
  entry.addEventListener('click', () => {
    document.querySelectorAll('.map-entry.selected').forEach((spot) => spot.classList.remove('selected'));
    entry.classList.add('selected');
    currentSpot = entry.dataset.spot;
    selectedSpot.textContent = currentSpot;
    selectionSummary.hidden = false;
    confirmMapButton.disabled = false;
  });
});

confirmMapButton.addEventListener('click', () => {
  updateSummary();
  showScreen('confirmation');
});

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.nav;
    if (target === 'request') showScreen('request');
    if (target === 'map') showScreen('map');
    if (target === 'confirmation') {
      updateSummary();
      showScreen('confirmation');
    }
  });
});

autoResult.addEventListener('click', () => {
  updateSummary();
  showScreen('confirmation');
});

document.querySelector('#new-reservation').addEventListener('click', () => {
  requestForm.reset();
  setDateMinimum();
  currentSpot = 'B1-A12';
  document.querySelectorAll('.map-entry.selected').forEach((spot) => spot.classList.remove('selected'));
  selectionSummary.hidden = true;
  confirmMapButton.disabled = true;
  showScreen('request');
});

setDateMinimum();

window.setTimeout(() => {
  if (activeScreen === 'auto') autoResult.hidden = false;
}, 2200);

autoScreen.addEventListener('click', () => {
  if (autoScreen.classList.contains('active')) {
    autoResult.hidden = false;
  }
});

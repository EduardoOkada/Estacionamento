// Projeto: Reserva Antecipada de Vagas Iguatemi | Integrantes: Bárbara Passos, Laura Rocha, Giovanna Taketani, André Cintra, Eduardo okada e Bruno Cesar
const screens = [...document.querySelectorAll('.screen')];
const navButtons = [...document.querySelectorAll('.bottom-nav button')];
const requestForm = document.querySelector('#request-form');
const dateInput = document.querySelector('#date');
const timeInput = document.querySelector('#time');
const plateInput = document.querySelector('#plate');
const selectedSpot = document.querySelector('#selected-spot');
const confirmMapButton = document.querySelector('#confirm-map');
const selectionSummary = document.querySelector('#selection-summary');
const autoResult = document.querySelector('#auto-result');
const autoScreen = document.querySelector('#auto-screen');
const autoSpotMessage = document.querySelector('#auto-spot-message');
const arrivalButton = document.querySelector('#simulate-arrival');
const parkingHours = document.querySelector('#parking-hours');
const payNowButton = document.querySelector('#pay-now');
const paymentResult = document.querySelector('#payment-result');
const paymentPricing = window.ParkingPricing;

let currentSpot = null;
let currentPlate = '';
let paidPayment = null;
let selectedMapSpot = null;
let recommendedSpot = null;
let activeScreen = 'request';
let autoTimer;

function setDateMinimum() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
  dateInput.min = localDate;
  if (!dateInput.value) dateInput.value = localDate;
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

function formatCurrency(cents) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(cents / 100);
}

function updatePriceBreakdown() {
  const quote = paymentPricing.calculate(Number(parkingHours.value));
  document.querySelector('#price-base').textContent = formatCurrency(quote.baseParkingCents);
  document.querySelector('#price-service').textContent = formatCurrency(quote.serviceFeeCents);
  document.querySelector('#price-additional-label').textContent =
    `Horas adicionais (${quote.additionalHours} ${quote.additionalHours === 1 ? 'hora' : 'horas'})`;
  document.querySelector('#price-additional').textContent = formatCurrency(quote.additionalHoursCents);
  document.querySelector('#price-total').textContent = formatCurrency(quote.totalCents);
  document.querySelector('#reservation-total').textContent = formatCurrency(quote.totalCents);
  payNowButton.textContent = `Pagar ${formatCurrency(quote.totalCents)}`;
}

function updateSummary() {
  document.querySelector('#summary-shopping').textContent = document.querySelector('#shopping').value;
  document.querySelector('#summary-date').textContent = `${formatDate(dateInput.value)} · ${formatTime(timeInput.value)}`;
  document.querySelector('#summary-spot').textContent = currentSpot || '—';
  document.querySelector('#summary-plate').textContent = currentPlate || '—';
}

function plateValue() {
  return plateInput.value.trim().toUpperCase();
}

function getNearestAvailableSpot() {
  const allSpots = [...document.querySelectorAll('#vip-grid .vaga')];
  const lastRow = Math.floor((allSpots.length - 1) / 4);

  return allSpots.reduce((nearest, spot, index) => {
    if (!spot.classList.contains('livre')) return nearest;
    const row = Math.floor(index / 4);
    const column = index % 4;
    const distanceToEntrance = Math.abs(lastRow - row) + Math.abs(1.5 - column);
    return !nearest || distanceToEntrance < nearest.distance
      ? { spot, distance: distanceToEntrance }
      : nearest;
  }, null)?.spot || null;
}

function setSpotStatus(spot, status, plate = '') {
  spot.classList.remove('livre', 'reservada', 'ocupada', 'selecionada');
  spot.classList.add(status);
  if (plate) spot.dataset.plate = plate;
  else delete spot.dataset.plate;

  const statusLabel = status === 'livre' ? 'livre' : status === 'reservada' ? 'reservada' : 'ocupada';
  spot.setAttribute('aria-label', `${spot.dataset.spot}, ${statusLabel}`);
}

function reserveSpot(spot) {
  if (!spot || !spot.classList.contains('livre')) return false;

  if (!requestForm.checkValidity()) {
    showScreen('request');
    requestForm.reportValidity();
    return false;
  }

  currentPlate = plateValue();
  if (!currentPlate) {
    plateInput.reportValidity();
    return false;
  }

  setSpotStatus(spot, 'reservada', currentPlate);
  currentSpot = spot.dataset.spot;
  paidPayment = null;
  document.querySelector('#reservation-status').textContent = 'Ativa';
  document.querySelector('#reservation-payment-status').textContent = 'Pendente';
  document.querySelector('#open-payment').disabled = false;
  parkingHours.value = '1';
  paymentResult.hidden = true;
  payNowButton.disabled = false;
  payNowButton.textContent = 'Pagar R$ 20,50';
  updatePriceBreakdown();
  selectedMapSpot = null;
  selectionSummary.hidden = true;
  confirmMapButton.disabled = true;
  arrivalButton.disabled = false;
  updateSummary();
  showScreen('confirmation');
  return true;
}

function clearCurrentReservation() {
  if (!currentSpot) return;
  const spot = [...document.querySelectorAll('.vaga')].find((entry) => entry.dataset.spot === currentSpot);
  if (spot?.classList.contains('reservada') && spot.dataset.plate === currentPlate) {
    setSpotStatus(spot, 'livre');
  }
  currentSpot = null;
  currentPlate = '';
}

function beginAutomaticSelection() {
  const availableSpot = getNearestAvailableSpot();
  if (!availableSpot) {
    window.alert('Não há vagas disponíveis no Bloco VIP no momento.');
    return;
  }

  recommendedSpot = availableSpot;
  autoSpotMessage.textContent = `A vaga mais próxima disponível é ${availableSpot.dataset.spot}.`;
  autoResult.hidden = true;
  showScreen('auto');
  window.clearTimeout(autoTimer);
  autoTimer = window.setTimeout(() => {
    if (activeScreen === 'auto') autoResult.hidden = false;
  }, 1200);
}

function simulateArrival() {
  if (!currentSpot || !currentPlate) {
    window.alert('Não há uma reserva ativa para simular a chegada.');
    return;
  }

  const spot = [...document.querySelectorAll('.vaga')].find((entry) => entry.dataset.spot === currentSpot);
  if (!spot || !spot.classList.contains('reservada') || spot.dataset.plate !== plateValue()) {
    window.alert('A placa informada não corresponde à reserva desta vaga.');
    return;
  }

  setSpotStatus(spot, 'ocupada');
  document.querySelector('#reservation-status').textContent = 'Em uso';
  arrivalButton.disabled = true;
  window.alert(`Chegada confirmada para a placa ${currentPlate} na vaga ${currentSpot}.`);
}

async function payForReservation() {
  if (!currentSpot || !currentPlate) {
    paymentResult.textContent = 'Faça uma reserva antes de realizar o pagamento.';
    paymentResult.hidden = false;
    return;
  }
  if (paidPayment) return;

  payNowButton.disabled = true;
  payNowButton.textContent = 'Processando pagamento...';
  paymentResult.hidden = true;

  try {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hours: Number(parkingHours.value),
        paymentMethod: document.querySelector('input[name="payment-method"]:checked').value,
        plate: currentPlate,
        spot: currentSpot,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível processar o pagamento.');

    paidPayment = result;
    document.querySelector('#reservation-status').textContent = 'Pago (demo)';
    document.querySelector('#reservation-payment-status').textContent = 'Pago (demo)';
    document.querySelector('#open-payment').disabled = true;
    payNowButton.textContent = 'Pagamento simulado concluído';
    paymentResult.textContent = `${result.message} Identificador: ${result.paymentId}`;
    paymentResult.classList.remove('error');
    paymentResult.hidden = false;
  } catch (error) {
    payNowButton.disabled = false;
    payNowButton.textContent = `Tentar novamente — ${document.querySelector('#price-total').textContent}`;
    paymentResult.textContent = `Pagamento não concluído: ${error.message}`;
    paymentResult.classList.add('error');
    paymentResult.hidden = false;
  }
}

requestForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!requestForm.reportValidity()) return;
  plateInput.value = plateValue();
  showScreen('preference');
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.action === 'auto') {
      beginAutomaticSelection();
      return;
    }
    showScreen(button.dataset.action);
  });
});

document.querySelectorAll('[data-back]').forEach((button) => {
  button.addEventListener('click', () => showScreen(button.dataset.back));
});

document.querySelectorAll('#vip-grid .vaga').forEach((spot) => {
  spot.addEventListener('click', () => {
    if (!spot.classList.contains('livre')) return;
    document.querySelectorAll('#vip-grid .vaga.selecionada').forEach((entry) => entry.classList.remove('selecionada'));
    spot.classList.add('selecionada');
    selectedMapSpot = spot;
    selectedSpot.textContent = spot.dataset.spot;
    selectionSummary.hidden = false;
    confirmMapButton.disabled = false;
  });
});

confirmMapButton.addEventListener('click', () => {
  if (!selectedMapSpot) return;
  reserveSpot(selectedMapSpot);
});

document.querySelector('#simulate-unauthorized').addEventListener('click', () => {
  const reservedSpot = document.querySelector('#vip-grid .vaga.reservada');
  const bufferSpot = document.querySelector('#buffer-grid .vaga.livre');
  if (!reservedSpot) {
    window.alert('Não há uma vaga VIP reservada para simular a ocupação indevida.');
    return;
  }
  if (!bufferSpot) {
    window.alert('Não há vagas Buffer disponíveis. A reserva VIP foi mantida.');
    return;
  }

  const displacedPlate = reservedSpot.dataset.plate;
  const displacedSpotCode = reservedSpot.dataset.spot;
  setSpotStatus(reservedSpot, 'ocupada');
  setSpotStatus(bufferSpot, 'reservada', displacedPlate);
  if (currentPlate === displacedPlate && currentSpot === displacedSpotCode) {
    currentSpot = bufferSpot.dataset.spot;
    updateSummary();
  }

  window.alert('Infração detectada! Câmera registrou placa não autorizada. Taxa de Ocupação Premium aplicada ao tíquete do invasor.');
});

arrivalButton.addEventListener('click', simulateArrival);
document.querySelector('#open-payment').addEventListener('click', () => {
  if (!currentSpot || !currentPlate) {
    window.alert('Faça uma reserva antes de abrir o pagamento.');
    return;
  }
  updatePriceBreakdown();
  showScreen('payment');
});
parkingHours.addEventListener('change', updatePriceBreakdown);
payNowButton.addEventListener('click', payForReservation);

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.nav;
    if (target === 'confirmation' && (!currentSpot || !currentPlate)) {
      window.alert('Faça uma reserva antes de consultar os detalhes.');
      return;
    }
    showScreen(target);
  });
});

autoResult.addEventListener('click', () => {
  if (!recommendedSpot || !recommendedSpot.classList.contains('livre')) {
    recommendedSpot = null;
    window.alert('A vaga indicada não está mais disponível. Escolha outra opção.');
    beginAutomaticSelection();
    return;
  }

  if (!reserveSpot(recommendedSpot)) return;
  recommendedSpot = null;
});

document.querySelector('#new-reservation').addEventListener('click', () => {
  clearCurrentReservation();
  requestForm.reset();
  setDateMinimum();
  selectedMapSpot = null;
  document.querySelectorAll('#vip-grid .vaga.selecionada').forEach((spot) => spot.classList.remove('selecionada'));
  selectionSummary.hidden = true;
  confirmMapButton.disabled = true;
  arrivalButton.disabled = true;
  paidPayment = null;
  document.querySelector('#open-payment').disabled = false;
  parkingHours.value = '1';
  paymentResult.hidden = true;
  paymentResult.classList.remove('error');
  updatePriceBreakdown();
  recommendedSpot = null;
  document.querySelector('#reservation-status').textContent = 'Ativa';
  autoResult.hidden = true;
  showScreen('request');
});

setDateMinimum();
arrivalButton.disabled = true;
updatePriceBreakdown();

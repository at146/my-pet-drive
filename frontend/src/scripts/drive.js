// Global state
let userData = null;
let map = null;
let currentStep = 1;
let routeData = { departure: "", destination: "", distance: 0, coords: {} };
let selectedTariff = null;
let markers = [];
let orderCodeGlobal = "";
let rowNumberGlobal = "";
let userIP = "";
// Get user IP
async function getUserIP() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    userIP = data.ip;
  } catch (error) {
    console.error("IP detection error:", error);
    userIP = "unknown";
  }
}
getUserIP();
// Phone mask handler
function applyPhoneMask(input) {
  let value = input.value.replace(/\D/g, "");
  if (value.length > 0 && value[0] !== "7") {
    value = `7${value}`;
  }
  let formatted = "+7";
  if (value.length > 1) {
    formatted += ` (${value.substring(1, 4)}`;
  }
  if (value.length >= 5) {
    formatted += `) ${value.substring(4, 7)}`;
  }
  if (value.length >= 8) {
    formatted += `-${value.substring(7, 9)}`;
  }
  if (value.length >= 10) {
    formatted += `-${value.substring(9, 11)}`;
  }
  input.value = formatted;
}
// Strip phone to numeric format
function stripPhone(phone) {
  return phone.replace(/\D/g, "");
}
// Add comment suggestion
function addCommentSuggestion(text) {
  const commentField = document.getElementById("driver-comment");
  if (commentField.value) {
    commentField.value += `; ${text}`;
  } else {
    commentField.value = text;
  }
}
// Check Step 2 required fields
function checkStep2Required() {
  const animalType = document.getElementById("animal-type").value;
  const weight = document.getElementById("weight").value;
  const tripDate = document.getElementById("trip-date").value;
  const phone = document.getElementById("phone").value;
  const allFilled = animalType && weight && tripDate && phone.length >= 10;
  document.getElementById("next-to-step-3").disabled = !allFilled;
}
// ====== ЗАМЕНИТЬ СТАРУЮ checkTariffAvailability() ЭТИМ КОДОМ ======
function checkTariffAvailability() {
  const tripDateVal = document.getElementById("trip-date").value;
  if (!tripDateVal) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tripDate = new Date(tripDateVal);
  tripDate.setHours(0, 0, 0, 0);
  // сутки в мс
  const ONE_DAY = 86_400_000;
  const diffDays = Math.round((tripDate - today) / ONE_DAY);
  const eco = document.getElementById("tariff-eco");
  const opti = document.getElementById("tariff-opti");
  const maxi = document.getElementById("tariff-maxi");
  // утилити-функция для включения / выключения карточки
  const setCard = (card, enable, msg) => {
    if (enable) {
      card.classList.remove("disabled");
      card.onclick = () => selectTariff(card.dataset.tariff);
    } else {
      card.classList.add("disabled");
      card.onclick = () => alert(msg);
    }
  };
  if (diffDays === 0) {
    // поездка СЕГОДНЯ
    setCard(eco, false, "Эко доступен при выезде через 2 дня и позже");
    setCard(opti, true);
    setCard(maxi, true);
  } else if (diffDays === 1) {
    // поездка ЗАВТРА
    setCard(eco, false, "Эко доступен при выезде через 2 дня и позже");
    setCard(opti, true);
    setCard(maxi, false, "Макси доступен только при выезде сегодня");
  } else {
    // поездка ≥ 2 дней
    setCard(eco, true);
    setCard(opti, false, "Опти доступен при выезде сегодня или завтра");
    setCard(maxi, false, "Макси доступен только при выезде сегодня");
  }
}
// Telegram Auth Handler
function handleTelegramAuth(user) {
  console.log("✓ Telegram auth:", user);
  userData = user;
  // HIDE Telegram auth section completely
  document.getElementById("telegram-auth-section").style.display = "none";
  // Show order form
  document.getElementById("order-form").classList.remove("hidden");
  // Set min date to today
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("trip-date").value = today;
  document.getElementById("trip-date").min = today;
}
// Navigation
function goToStep(step) {
  // Hide all steps
  document
    .querySelectorAll(".step")
    .forEach((s) => s.classList.remove("active"));
  // Show target step
  document.getElementById(`step-${step}`).classList.add("active");
  // Update progress bar
  document.querySelectorAll(".progress-step").forEach((el, i) => {
    el.classList.remove("active", "completed");
    if (i + 1 < step) el.classList.add("completed");
    if (i + 1 === step) el.classList.add("active");
  });
  currentStep = step;
  window.scrollTo({ top: 0, behavior: "smooth" });
  // Update tariff costs if going to step 3
  if (step === 3) {
    updateTariffCosts();
    document.getElementById("distance-3").textContent = routeData.distance;
    checkTariffAvailability();
  }
  // Update summary if going to step 4
  if (step === 4) {
    updateSummary();
  }
}
// Get Current Location
function getCurrentLocation() {
  if (!navigator.geolocation) {
    alert("Геолокация не поддерживается вашим браузером");
    return;
  }
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = "⏳ Определение...";
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        );
        const data = await response.json();
        document.getElementById("departure").value = data.display_name;
        routeData.coords.departure = [lat, lon];
        console.log("✓ Location found:", data.display_name);
      } catch (error) {
        console.error("Geocoding error:", error);
        alert("Ошибка определения адреса");
      }
      btn.disabled = false;
      btn.textContent = "Определить моё местоположение";
    },
    (error) => {
      console.error("Geolocation error:", error);
      alert(
        "Не удалось определить местоположение. Разрешите доступ к геолокации.",
      );
      btn.disabled = false;
      btn.textContent = "Определить моё местоположение";
    },
  );
}
// Calculate Route
async function calculateRoute() {
  const departure = document.getElementById("departure").value.trim();
  const destination = document.getElementById("destination").value.trim();
  if (!departure || !destination) {
    alert("Заполните оба адреса");
    return;
  }
  routeData.departure = departure;
  routeData.destination = destination;
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = "⏳ Расчёт маршрута...";
  try {
    // Geocode departure if needed
    if (!routeData.coords.departure) {
      const depResp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          departure,
        )}&limit=1`,
      );
      const depData = await depResp.json();
      if (!depData || depData.length === 0)
        throw new Error("Адрес отправления не найден");
      routeData.coords.departure = [
        parseFloat(depData[0].lat),
        parseFloat(depData[0].lon),
      ];
    }
    // Geocode destination
    const destResp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        destination,
      )}&limit=1`,
    );
    const destData = await destResp.json();
    if (!destData || destData.length === 0)
      throw new Error("Адрес назначения не найден");
    routeData.coords.destination = [
      parseFloat(destData[0].lat),
      parseFloat(destData[0].lon),
    ];
    // Calculate distance (Haversine formula)
    const R = 6371; // Earth radius in km
    const lat1 = (routeData.coords.departure[0] * Math.PI) / 180;
    const lat2 = (routeData.coords.destination[0] * Math.PI) / 180;
    const dLat =
      ((routeData.coords.destination[0] - routeData.coords.departure[0]) *
        Math.PI) /
      180;
    const dLon =
      ((routeData.coords.destination[1] - routeData.coords.departure[1]) *
        Math.PI) /
      180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    routeData.distance = Math.round(R * c);
    console.log("✓ Distance calculated:", routeData.distance, "km");
    // Show map
    showMap();
    // Show results
    document.getElementById("distance").textContent = routeData.distance;
    document.getElementById("route-result").classList.remove("hidden");
    document.getElementById("next-to-step-2").disabled = false;
  } catch (error) {
    console.error("Route calculation error:", error);
    alert(`Ошибка расчёта маршрута: ${error.message}`);
  }
  btn.disabled = false;
  btn.textContent = "Рассчитать маршрут";
}
// Show Map
function showMap() {
  const mapDiv = document.getElementById("map");
  mapDiv.classList.remove("hidden");
  if (!map) {
    map = L.map("map");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);
  }
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
  const m1 = L.marker(routeData.coords.departure)
    .addTo(map)
    .bindPopup("Откуда");
  const m2 = L.marker(routeData.coords.destination)
    .addTo(map)
    .bindPopup("Куда");
  markers.push(m1, m2);
  const line = L.polyline(
    [routeData.coords.departure, routeData.coords.destination],
    {
      color: "#667eea",
      weight: 3,
    },
  ).addTo(map);
  markers.push(line);
  map.fitBounds([routeData.coords.departure, routeData.coords.destination], {
    padding: [50, 50],
  });
}
// Select Tariff
function selectTariff(tariff) {
  // Check if tariff is disabled
  const tariffCard = document.getElementById(`tariff-${tariff}`);
  if (tariffCard.classList.contains("disabled")) {
    return;
  }
  selectedTariff = tariff;
  document
    .querySelectorAll(".tariff-card")
    .forEach((c) => c.classList.remove("selected"));
  document.querySelector(`[data-tariff="${tariff}"]`).classList.add("selected");
  document.getElementById("next-to-step-4").disabled = false;
  calculateCost();
}
// Update Tariff Costs
function updateTariffCosts() {
  const prices = { eco: 75, opti: 105, maxi: 150 };
  Object.entries(prices).forEach(([id, price]) => {
    const cost = routeData.distance * price;
    document.querySelector(`.${id}-cost`).textContent = cost;
  });
}
// ====== ЗАМЕНИТЬ СТАРУЮ calculateCost() ЭТИМ КОДОМ ======
function calculateCost() {
  if (!selectedTariff) return;
  const prices = { eco: 75, opti: 105, maxi: 150 };
  const baseCost = routeData.distance * prices[selectedTariff];
  let totalCost, driverCost, shortDistanceFee;
  if (baseCost < 800) {
    // Минимальная подача 800₽ (уже с включённой комиссией 21%)
    shortDistanceFee = 800 - baseCost;
    totalCost = 800; // Фиксированная сумма
    driverCost = 632; // 79% от 800₽
    document.getElementById("short-distance-notice").classList.remove("hidden");
    document.getElementById("short-distance-fee").textContent =
      shortDistanceFee;
  } else {
    // Обычный расчёт для поездок от 800₽
    shortDistanceFee = 0;
    const acquiring = Math.round(baseCost * 0.105); // 10.5%
    const service = Math.round(baseCost * 0.105); // 10.5%
    totalCost = baseCost + acquiring + service;
    driverCost = baseCost;
    document.getElementById("short-distance-notice").classList.add("hidden");
  }
  document.getElementById("total-cost").textContent = totalCost;
  document.getElementById("driver-cost").textContent = driverCost;
  return { totalCost, driverCost, shortDistanceFee };
}
// Update Summary
function updateSummary() {
  const costs = calculateCost();
  document.getElementById("summary-route").textContent =
    `${routeData.departure} → ${routeData.destination} (${routeData.distance} км)`;
  document.getElementById("summary-pet").textContent = `${
    document.getElementById("animal-type").value
  },
${document.getElementById("weight").value || 0}кг`;
  document.getElementById("summary-date").textContent = `${
    document.getElementById("trip-date").value
  } в
${document.getElementById("trip-time").value}`;
  // Show comment if exists
  const comment = document.getElementById("driver-comment").value;
  if (comment) {
    document.getElementById("summary-comment").textContent = comment;
    document.getElementById("summary-comment-block").classList.remove("hidden");
  } else {
    document.getElementById("summary-comment-block").classList.add("hidden");
  }
  document.getElementById("summary-cost").textContent = costs.totalCost;
}
// Submit Order
async function submitOrder() {
  const btn = document.getElementById("submit-btn");
  btn.disabled = true;
  btn.textContent = "⏳ Отправка заказа...";
  try {
    const orderCode = generateOrderCode();
    orderCodeGlobal = orderCode;
    const costs = calculateCost();
    const timestamp = new Date().toISOString();
    const phoneStripped = stripPhone(document.getElementById("phone").value);
    const orderData = {
      order_code: orderCode,
      telegram_id: userData.id,
      client_name: userData.first_name,
      client_username: userData.username || "",
      client_phone: phoneStripped,
      departure_address: routeData.departure,
      destination_address: routeData.destination,
      distance_km: routeData.distance,
      animal_type: document.getElementById("animal-type").value,
      breed: document.getElementById("breed").value || "",
      weight_kg: parseFloat(document.getElementById("weight").value) || 0,
      trip_date: document.getElementById("trip-date").value,
      trip_time: document.getElementById("trip-time").value,
      tariff: selectedTariff,
      total_cost: costs.totalCost,
      driver_cost: costs.driverCost,
      mssg_cl: document.getElementById("driver-comment").value || "",
      status: "ОЖИДАНИЕ_ОТКЛИКОВ",
      created_at: timestamp,
      driver_responses: "[]",
      approve: `✓ ; ${timestamp} ; ${userIP} ; ${userData.id}`,
    };
    console.log("Sending order to backend:/api/create-order", orderData);
    // Send to backend which will store in SheetDB and notify Telegram
    const response = await fetch(`/api/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Backend error: ${response.status} ${txt}`);
    }
    const respData = await response.json();
    const rowNumber = respData.row_number || 1;
    rowNumberGlobal = rowNumber;
    console.log("✓ Order created via backend:", respData);
    // Show success
    document.getElementById("order-code-display").textContent = orderCode;
    goToStep(5);
    // Start countdown for redirect
    startRedirectCountdown();
  } catch (error) {
    console.error("Submit error:", error);
    alert(`Ошибка создания заказа: ${error.message}`);
    btn.disabled = false;
    btn.textContent = "Оформить заказ";
  }
}
// Start redirect countdown
function startRedirectCountdown() {
  let seconds = 5;
  const countdownElement = document.getElementById("countdown");
  const interval = setInterval(() => {
    seconds--;
    countdownElement.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(interval);
      goToOrderPage();
    }
  }, 1000);
}
// Go to order page
function goToOrderPage() {
  if (orderCodeGlobal && rowNumberGlobal) {
    window.location.href = `/route?${rowNumberGlobal}-${orderCodeGlobal}`;
  }
}
// Generate Order Code
function generateOrderCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Auto-calculate cost on weight change
  document.getElementById("weight").addEventListener("input", () => {
    if (selectedTariff) calculateCost();
  });
  // Phone mask
  const phoneInput = document.getElementById("phone");
  phoneInput.addEventListener("input", function () {
    applyPhoneMask(this);
  });
  // Enable/disable buttons based on input
  const departureInput = document.getElementById("departure");
  const destinationInput = document.getElementById("destination");
  const calcBtn = document.getElementById("calc-route-btn");
  function checkRouteInputs() {
    const departure = departureInput.value.trim();
    const destination = destinationInput.value.trim();
    calcBtn.disabled = !(departure && destination);
  }
  departureInput.addEventListener("input", checkRouteInputs);
  destinationInput.addEventListener("input", checkRouteInputs);
  // Consent checkbox
  const consentCheckbox = document.getElementById("consent-checkbox");
  const submitBtn = document.getElementById("submit-btn");
  consentCheckbox.addEventListener("change", function () {
    submitBtn.disabled = !this.checked;
  });
  // Step 2 required fields validation
  document
    .getElementById("animal-type")
    .addEventListener("change", checkStep2Required);
  document
    .getElementById("weight")
    .addEventListener("input", checkStep2Required);
  document.getElementById("trip-date").addEventListener("change", () => {
    checkStep2Required();
    checkTariffAvailability();
  });
  phoneInput.addEventListener("input", checkStep2Required);
});

// Expose functions to global scope for inline handlers and Telegram widget
window.handleTelegramAuth = handleTelegramAuth;
window.getCurrentLocation = getCurrentLocation;
window.calculateRoute = calculateRoute;
window.goToStep = goToStep;
window.selectTariff = selectTariff;
window.addCommentSuggestion = addCommentSuggestion;
window.submitOrder = submitOrder;
window.goToOrderPage = goToOrderPage;

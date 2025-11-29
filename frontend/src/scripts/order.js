const API_URL = import.meta.env.VITE_API_URL;

const CONFIG = {
  COMMISSION_RATE: 0.21, // 21% комиссия
};

let driver = null;
let order = null;
let map,
  markers = [];

const botLogin = import.meta.env.VITE_TELEGRAM_BOT_LOGIN;
const script = document.createElement("script");
script.src = "https://telegram.org/js/telegram-widget.js?22";
script.async = true;
script.setAttribute("data-telegram-login", botLogin);
script.setAttribute("data-size", "large");
script.setAttribute("data-onauth", "onTelegramAuth(user)");
script.setAttribute("data-request-access", "write");
document.getElementById("telegram-login-container").appendChild(script);

function onTelegramAuth(u) {
  driver = u;
  document.getElementById("tg-auth").classList.add("hidden");
  document.getElementById("content").classList.remove("hidden");
  init();
}

async function init() {
  const q = location.search.replace("?", "").split("-");
  if (q.length !== 2) {
    alert("Некорректная ссылка заказа");
    return;
  }
  const orderCode = q[1];
  document.getElementById("order-code").textContent = orderCode;

  try {
    const r = await fetch(`${API_URL}/api/orders/${orderCode}`);
    if (!r.ok) {
      alert("Заказ не найден");
      return;
    }
    const data = await r.json();
    order = data;

    // ВАЛИДАЦИЯ СТАТУСА ЗАКАЗА
    const validationResult = validateOrderStatus(order.status);
    if (!validationResult.isValid) {
      showStatusError(validationResult.message);
      return;
    }

    fillOrderCard();
    // TODO: почему получаю все заказы
    await tryFillDriverFields();
  } catch (e) {
    alert("Ошибка загрузки заказа");
    console.error(e);
  }
}

function validateOrderStatus(status) {
  // статусы, при которых отклик категорически запрещён
  const blocked = {
    ОТМЕНА:
      "К сожалению, на данный заказ больше нельзя откликнуться, он был отменён.",
    ОЖИДАНИЕ_ОПЛАТЫ:
      "К сожалению, на данный заказ больше нельзя откликнуться, клиент уже выбрал исполнителя.",
    ОПЛАЧЕН:
      "К сожалению, на данный заказ больше нельзя откликнуться, клиент уже выбрал исполнителя и оплатил поездку.",
  };

  if (blocked[status]) {
    return { isValid: false, message: blocked[status] };
  }

  // принять отклик можно только на этапах СОЗДАН или ОЖИДАНИЕ_ОТКЛИКОВ
  const allowed = ["ОЖИДАНИЕ_ОТКЛИКОВ"];

  if (!allowed.includes(status)) {
    return {
      isValid: false,
      message:
        "К сожалению, на данный заказ невозможно откликнуться, поиск исполнителя не запущен или прекращён.",
    };
  }

  // всё хорошо — форма остаётся доступной
  return { isValid: true };
}

function showStatusError(message) {
  document.getElementById("status-error-text").textContent = message;
  document.getElementById("status-error").classList.remove("hidden");
  document.getElementById("order-card").classList.add("hidden");
  document.getElementById("bid-form-container").classList.add("hidden");
}

function fillOrderCard() {
  const rt = `${order.departure_address} → ${order.destination_address}`;
  document.getElementById("route").textContent = rt;
  document.getElementById("distance").textContent = order.distance_km;
  document.getElementById("datetime").textContent = `${order.trip_date} в ${
    order.trip_time || "—"
  }`;
  document.getElementById("pet").textContent =
    `${order.animal_type}, ${order.weight_kg} кг`;
  document.getElementById("driver-pay").textContent = order.driver_cost;
  document.getElementById("bid").value = order.driver_cost;

  if (order.mssg_cl?.trim()) {
    document.getElementById("client-comment-block").classList.remove("hidden");
    document.getElementById("client-comment").textContent = order.mssg_cl;
  }

  if (order.departure_address && order.destination_address) {
    showMiniMap();
  }
}

function showMiniMap() {
  document.getElementById("map").classList.remove("hidden");
  if (!map) {
    map = L.map("map", {
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
      map,
    );
  }

  Promise.all([geo(order.departure_address), geo(order.destination_address)])
    .then((c) => {
      markers.forEach((m) => map.removeLayer(m));
      markers = [];
      const m1 = L.marker(c[0]).addTo(map).bindPopup("Откуда");
      const m2 = L.marker(c[1]).addTo(map).bindPopup("Куда");
      const line = L.polyline([c[0], c[1]], {
        color: "#667eea",
        weight: 3,
      }).addTo(map);
      markers.push(m1, m2, line);
      map.fitBounds([c[0], c[1]], { padding: [30, 30] });
    })
    .catch(() => {
      document.getElementById("map").classList.add("hidden");
    });
}

async function geo(addr) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      addr,
    )}&limit=1`,
  );
  const d = await r.json();
  if (!d || !d.length) throw new Error("Geocode failed");
  return [parseFloat(d[0].lat), parseFloat(d[0].lon)];
}

async function tryFillDriverFields() {
  try {
    const r = await fetch(`${API_URL}/api/orders`);
    const allData = await r.json();
    let lastDriverData = null;

    for (let i = allData.length - 1; i >= 0; i--) {
      const row = allData[i];
      if (!row.driver_responses || row.driver_responses === "[]") continue;

      let respArr;
      try {
        respArr = JSON.parse(row.driver_responses);
      } catch (_e) {
        continue;
      }

      if (Array.isArray(respArr)) {
        for (let j = respArr.length - 1; j >= 0; j--) {
          const resp = respArr[j];
          if (resp.telegram_id === driver.id) {
            lastDriverData = resp;
            break;
          }
        }
      }
      if (lastDriverData) break;
    }

    if (lastDriverData) {
      if (lastDriverData.phone)
        document.getElementById("driver-phone").value = lastDriverData.phone;
      if (lastDriverData.car_brand)
        document.getElementById("driver-car-brand").value =
          lastDriverData.car_brand;
      if (lastDriverData.car_num)
        document.getElementById("driver-car-num").value =
          lastDriverData.car_num;
      if (lastDriverData.car_color)
        document.getElementById("driver-car-color").value =
          lastDriverData.car_color;
    }
  } catch (e) {
    console.warn("Ошибка автозаполнения данных водителя:", e);
  }
}

document.getElementById("bid-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const bid = parseFloat(document.getElementById("bid").value) || 0;
  const comment = document.getElementById("comment").value.trim();
  let phone = document.getElementById("driver-phone").value.trim();

  if (phone.startsWith("+")) phone = phone.substring(1);

  const car_brand = document.getElementById("driver-car-brand").value.trim();
  const car_num = document.getElementById("driver-car-num").value.trim();
  const car_color = document.getElementById("driver-car-color").value.trim();

  if (bid <= 0 || !phone || !car_brand || !car_num || !car_color) {
    alert("Пожалуйста, заполните все обязательные поля.");
    return;
  }

  let resp = [];
  try {
    resp = JSON.parse(order.driver_responses || "[]");
  } catch {}

  if (resp.some((r) => r.telegram_id === driver.id)) {
    alert("Вы уже откликнулись на этот заказ");
    return;
  }
  // TODO: проверить, что ставка не ниже минимальной (order.driver_cost)
  // TODO: можно поменять цену
  // Расчет стоимости с комиссией 21%
  const cost_with_com = Math.round(bid * (1 + CONFIG.COMMISSION_RATE));

  const newResp = {
    telegram_id: driver.id,
    username: driver.username || "",
    first_name: driver.first_name,
    bid: bid,
    cost_with_com: cost_with_com, // НОВАЯ ПЕРЕМЕННАЯ с комиссией 21%
    comment: comment,
    phone: phone,
    car_brand: car_brand,
    car_num: car_num,
    car_color: car_color,
    created_at: new Date().toISOString(),
  };

  resp.push(newResp);

  try {
    await fetch(`${API_URL}/api/orders/${order.order_code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "ОЖИДАНИЕ_ОТКЛИКОВ",
        driver_responses: JSON.stringify(resp),
      }),
    });
  } catch (err) {
    alert("Ошибка сохранения отклика");
    console.error(err);
    return;
  }

  await sendNotif(newResp);
  document.getElementById("bid-form-container").classList.add("hidden");
  document.getElementById("success").classList.remove("hidden");
});

async function sendNotif(resp) {
  const link = `https://xn--80ahcabg2akskmd2q.xn--p1ai/route?${rowNumber}-${order.order_code}`;
  // ТГ клиенту
  // Для клиента: первое имя водителя, марка авто, комментарий и стоимость с комиссией 21%
  const clientMsg =
    `<b>Новый отклик по заказу №${order.order_code}</b>\n` +
    `Водитель: ${resp.first_name}\n` +
    `Марка авто: ${resp.car_brand || "—"}\n` +
    `Комментарий: ${resp.comment || "—"}\n` +
    `Сумма с комиссией: ${resp.cost_with_com}₽\n` +
    `<a href="${link}">Подтвердить предложение</a>`;

  await fetch(`${API_URL}/api/telegram/notification/client`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: order.telegram_id,
      text: clientMsg,
    }),
  });
  // ТГ админу
  // Для админа: полная разбивка с использованием cost_with_com
  const adminPaying = Math.round(resp.bid * 0.105);
  const adminFactProfit = Math.round(resp.bid * 0.105);
  const adminMsg =
    `<b>Отклик по заказу №${order.order_code}</b>\n` +
    `Водитель: ${resp.first_name}\n` +
    `Телефон: ${resp.phone}\n` +
    `Марка: ${resp.car_brand}\n` +
    `Номер: ${resp.car_num}\n` +
    `Цвет: ${resp.car_color}\n` +
    `Сумма предложения (драйвер): ${resp.bid}₽\n` +
    `Стоимость с комиссией 21%: ${resp.cost_with_com}₽\n` +
    `— Эквайринг 10,5%: ${adminPaying}₽\n` +
    `— Факт. доход 10,5%: ${adminFactProfit}₽`;

  await fetch(`${API_URL}/api/telegram/notification/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: adminMsg,
    }),
  });
  // ТГ драйвер-чат
  // Для чата водителей: стандартно
  await fetch(`${API_URL}/api/telegram/notification/drivers-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `По заказу №${order.order_code} +1 новый отклик`,
    }),
  });
}

window.onTelegramAuth = onTelegramAuth;

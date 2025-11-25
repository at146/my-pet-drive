const CONF = {
  SHEET: "https://sheetdb.io/api/v1/pjrkb7sw0hmdm",
  MERCHANT: "Petsit",
  PASS1: "ejY7rDzZWA77Lk27mLrI",
  BOT_TOKEN: "7287717757:AAEWkHMn6_qTdtjmA1QeWkwUXhk1WJ9Uowo",
  ADM_CHAT: "209183016",
  DRV_CHAT: "-1001905857177",
};
const p = location.search.replace("?", "").split("-");
if (p.length !== 2) {
  alert("Неверная ссылка");
  throw "";
}
const ROW = p[0],
  CODE = p[1];
document.getElementById("code").textContent = CODE;
let order = null,
  map,
  markers = [];

async function loadOrder() {
  try {
    const r = await fetch(`${CONF.SHEET}/search?order_code=${CODE}`);
    const d = await r.json();
    if (!d.length) {
      alert("Заказ не найден");
      return;
    }
    order = d[0];
    if (!order.status || order.status === "СОЗДАН" || order.status === "") {
      order.status = "ОЖИДАНИЕ_ОТКЛИКОВ";
    }
    if (order.driver_select) {
      const sel = JSON.parse(order.driver_select);
      order.driver_first_name = order.driver_first_name || sel.first_name;
      order.driver_username = order.driver_username || sel.username;
      order.driver_bid = order.driver_bid || sel.bid;
      order.driver_comment = order.driver_comment || sel.comment;
      order.driver_phone = order.driver_phone || sel.phone;
      order.driver_car = order.driver_car || sel.car_brand;
      order.driver_num = order.driver_num || sel.car_num;
      order.driver_color = order.driver_color || sel.car_color;
      order.driver_cost_with_com =
        order.driver_cost_with_com || sel.cost_with_com;
    }
    render();
  } catch (e) {
    console.error(e);
  }
}
loadOrder();
setInterval(loadOrder, 10000);

function render() {
  el("route", `${order.departure_address} → ${order.destination_address}`);
  el("dist", order.distance_km);
  el("pet", `${order.animal_type}, ${order.weight_kg} кг`);
  el("dt", `${order.trip_date} в ${order.trip_time}`);
  el("cost", order.total_cost);
  if (!map) mini();
  else updateMap();
  statusUI();
  bidsUI();
  driverUI();
  cancelUI();
  cancelLogicUI();
}

function el(id, v) {
  document.getElementById(id).textContent = v;
}

function statusUI() {
  document
    .querySelectorAll(".stepbar div")
    .forEach((d) => d.classList.remove("done", "active"));
  const badge = document.getElementById("badge");
  const sd = (s) => document.getElementById(`s${s}`).classList.add("done");
  const sa = (s) => document.getElementById(`s${s}`).classList.add("active");
  const set = (t, c) => {
    badge.textContent = t;
    badge.className = `badge ${c}`;
  };
  switch (order.status) {
    case "СОЗДАН":
      set("Создан", "gray");
      sa(1);
      break;
    case "ОЖИДАНИЕ_ОТКЛИКОВ":
      set("Ожидание откликов", "yellow");
      sd(1);
      sa(2);
      break;
    case "ВОДИТЕЛЬ_НАЙДЕН":
      set("Водитель найден", "blue");
      sd(1);
      sd(2);
      sa(3);
      break;
    case "ОЖИДАНИЕ_ОПЛАТЫ":
      set("Ожидание оплаты", "orange");
      sd(1);
      sd(2);
      sd(3);
      sa(4);
      break;
    case "ОПЛАЧЕН":
      set("Оплачено", "green");
      sd(1);
      sd(2);
      sd(3);
      sd(4);
      sa(5);
      break;
    case "УСПЕШНО":
      set("Завершено", "green");
      sd(1);
      sd(2);
      sd(3);
      sd(4);
      sd(5);
      break;
    case "ОТМЕНА":
      set("Отменён", "red");
      break;
    default:
      set("Создан", "gray");
      sa(1);
  }
}

function bidsUI() {
  const box = document.getElementById("bids"),
    list = document.getElementById("bid-list");
  if (
    order.driver_responses &&
    order.driver_responses !== "[]" &&
    ["СОЗДАН", "ОЖИДАНИЕ_ОТКЛИКОВ"].includes(order.status)
  ) {
    const bids = JSON.parse(order.driver_responses);
    document.getElementById("bid-count").textContent = bids.length;
    list.innerHTML = bids
      .map(
        (b, i) => `
      <div style="border:2px solid #e0e0e0;border-radius:10px;padding:12px;margin-bottom:12px"> <b>${
        b.first_name
      }</b><br>
         Итоговая цена: ${b.cost_with_com || "-"} ₽<br>
         Машина: ${b.car_brand || "-"}<br>
         Комментарий: ${
           b.comment || "—"
         }<br><br> <button onclick="confirmDriver(${i})">Подтвердить</button> </div>`
      )
      .join("");
    box.classList.remove("hidden");
  } else box.classList.add("hidden");
}

function driverUI() {
  const box = document.getElementById("driver"),
    payBtn = document.getElementById("pay-btn");
  if (
    ["ВОДИТЕЛЬ_НАЙДЕН", "ОЖИДАНИЕ_ОПЛАТЫ", "ОПЛАЧЕН", "УСПЕШНО"].includes(
      order.status
    )
  ) {
    el("drv-name", `${order.driver_first_name}`);
    el("drv-bid", order.driver_cost_with_com || order.driver_bid);
    el("drv-com", order.driver_comment || "—");
    box.classList.remove("hidden");
    if (["ОПЛАЧЕН", "УСПЕШНО"].includes(order.status)) {
      document.getElementById("contacts").classList.remove("hidden");
      el("drv-phone", order.driver_phone || "-");
      el("drv-car", order.driver_car || "-");
      el("drv-num", order.driver_num || "-");
      el("drv-color", order.driver_color || "-");
    }
    if (order.status === "ОЖИДАНИЕ_ОПЛАТЫ") {
      payBtn.classList.remove("hidden");
      payBtn.onclick = order.payment_url
        ? () => window.open(order.payment_url, "_blank")
        : createPayment;
    } else {
      payBtn.classList.add("hidden");
    }
  } else {
    box.classList.add("hidden");
  }
}

function cancelUI() {
  if (order.status === "ОТМЕНА") {
    document.getElementById("cancel").classList.remove("hidden");
    let reason = (order.cancel_wtf || "").split(";")[0].trim();
    document.getElementById("cancel-reason").textContent = reason
      ? reason
      : "Причина не указана";
  } else document.getElementById("cancel").classList.add("hidden");
}

function mini() {
  const mapDiv = document.getElementById("map");
  mapDiv.classList.remove("hidden");
  map = L.map(mapDiv, {
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
  });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    crossOrigin: true,
  }).addTo(map);
  updateMap();
}

function updateMap() {
  Promise.all([geo(order.departure_address), geo(order.destination_address)])
    .then((c) => {
      if (markers.length) {
        markers.forEach((m) => map.removeLayer(m));
        markers = [];
      }
      const m1 = L.marker(c[0]).addTo(map),
        m2 = L.marker(c[1]).addTo(map);
      const line = L.polyline([c[0], c[1]], {
        color: "#667eea",
        weight: 3,
      }).addTo(map);
      markers = [m1, m2, line];
      map.fitBounds([c[0], c[1]], { padding: [30, 30] });
      setTimeout(() => map.invalidateSize(), 200);
    })
    .catch(() => document.getElementById("map").classList.add("hidden"));
}

async function geo(addr) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      addr
    )}&limit=1`
  );
  const d = await r.json();
  return [+d[0].lat, +d[0].lon];
}

// --- КНОПКА ОТМЕНЫ --- //
function cancelLogicUI() {
  const vis = (v, el) => {
    el.classList[v ? "remove" : "add"]("hidden");
  };
  let btns = document.getElementById("cancel-btns"),
    cancelInit = document.getElementById("cancel-init"),
    cancelForm = document.getElementById("cancel-form"),
    cancelFinal = document.getElementById("cancel-final"),
    cancelBack = document.getElementById("cancel-back"),
    cancelInput = document.getElementById("cancel-reason-input");
  vis(["ОЖИДАНИЕ_ОТКЛИКОВ", "ОЖИДАНИЕ_ОПЛАТЫ"].includes(order.status), btns);
  if (btns.getAttribute("init")) return;
  btns.setAttribute("init", "y");
  cancelInit.onclick = () => {
    vis(1, cancelForm);
    vis(0, cancelInit);
  };
  cancelBack.onclick = () => {
    vis(1, cancelInit);
    vis(0, cancelForm);
    cancelInput.value = "";
  };
  document.querySelectorAll(".suggestion").forEach(
    (e) =>
      (e.onclick = () => {
        cancelInput.value = e.textContent;
      })
  );
  cancelFinal.onclick = async () => {
    let reason = cancelInput.value || "";
    if (!reason.trim()) {
      cancelInput.style.borderColor = "red";
      return;
    } else cancelInput.style.borderColor = "#ccc";
    let payload = {
      status: "ОТМЕНА",
      cancel_wtf: `${reason}; ${new Date().toLocaleString("ru-RU")}`,
    };
    await fetch(`${CONF.SHEET}/order_code/${CODE}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: payload }),
    });
    await sendCancelNotif(reason);
    await loadOrder();
  };
}

async function sendCancelNotif(cause) {
  const bot = `https://api.telegram.org/bot${CONF.BOT_TOKEN}/sendMessage`;
  try {
    // ТГ клиенту
    await fetch(bot, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: order.telegram_id,
        text: `Заказ №${order.order_code} был отменён. Мы будем рады помочь с перевозкой питомца в другой раз!`,
        parse_mode: "HTML",
      }),
    });
    // ТГ админу
    await fetch(bot, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CONF.ADM_CHAT,
        text: `Заказ №${order.order_code} был отменён с указанием причины: ${cause}\nДанные клиента:\n• Telegram: @${order.client_username}\n• Телефон: ${order.client_phone}`,
        parse_mode: "HTML",
      }),
    });
    // ТГ драйвер-чат
    await fetch(bot, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CONF.DRV_CHAT,
        text: `❌ Сбор и рассмотрение откликов для заказа №${order.order_code} остановлен(ы)\n\nПримечание: Клиент отменил заказ\n\n❌ ОТМЕНА`,
        parse_mode: "HTML",
      }),
    });
  } catch (e) {
    console.error("Ошибка отправки уведомлений об отмене:", e);
  }
}

async function confirmDriver(i) {
  if (!confirm("Подтвердить этого водителя?")) return;
  const bids = JSON.parse(order.driver_responses),
    drv = bids[i];
  try {
    await fetch(`${CONF.SHEET}/order_code/${CODE}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          status: "ОЖИДАНИЕ_ОПЛАТЫ",
          driver_select: JSON.stringify(drv),
          driver_first_name: drv.first_name,
          driver_username: drv.username,
          driver_bid: drv.bid,
          driver_comment: drv.comment,
          driver_phone: drv.phone,
          driver_car: drv.car_brand,
          driver_num: drv.car_num,
          driver_color: drv.car_color,
          driver_cost_with_com: drv.cost_with_com,
          driver_confirmed_at: new Date().toISOString(),
        },
      }),
    });
    await sendConfirmNotif(drv);
    alert("Водитель подтверждён!");
    await loadOrder();
  } catch (e) {
    alert("Ошибка");
    console.error(e);
  }
}

async function sendConfirmNotif(drv) {
  const bot = `https://api.telegram.org/bot${CONF.BOT_TOKEN}/sendMessage`;
  try {
    // Водителю
    await fetch(bot, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: drv.telegram_id,
        text: `✅ Вы выбраны для заказа №${order.order_code}!\n\n Клиент: ${order.client_name}\n Маршрут:\n${order.departure_address} → ${order.destination_address}\n ДИСТАНЦИЯ: ${order.distance_km} км\n Питомец: ${order.animal_type}, ${order.weight_kg} кг\n Дата и время: ${order.trip_date} в ${order.trip_time}\n\n Ваша оплата: ${drv.bid}₽\n\n⏳ Ожидайте оплаты от клиента.\nКонтактные данные будут доступны после оплаты.`,
        parse_mode: "HTML",
      }),
    });
    // Админу
    await fetch(bot, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CONF.ADM_CHAT,
        text: `✅ Водитель выбран для заказа №${order.order_code}\n\n Клиент: ${order.client_name} (@${order.client_username})\n Водитель: ${drv.first_name} (@${drv.username})\n\n Ставка водителя: ${drv.bid} ₽\n Стоимость заказа: ${drv.cost_with_com} ₽\n ${order.departure_address} → ${order.destination_address}\n\n⏳ Ожидание оплаты`,
        parse_mode: "HTML",
      }),
    });
    // Драйвер-чат
    await fetch(bot, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CONF.DRV_CHAT,
        text: `❌ Сбор откликов для заказа №${order.order_code} остановлен\n\nПоздравляем (@${drv.username}) с назначением на заказ!\n\n⏳ Ожидание оплаты`,
        parse_mode: "HTML",
      }),
    });
  } catch (e) {
    console.error("Ошибка отправки уведомлений о подтверждении:", e);
  }
}

function createPayment() {
  const sum = parseFloat(order.driver_cost_with_com || order.driver_bid || 0);
  if (!sum) {
    alert("Ставка водителя не указана");
    return;
  }
  const outSum = sum.toFixed(2);
  const invId = Math.floor(1e9 + Math.random() * 9e9);
  const desc = "Поездка в зоотакси MyPetDrive";
  const receiptObj = {
    sno: "usn_income",
    items: [
      {
        name: desc,
        quantity: 1,
        sum: sum,
        payment_method: "full_payment",
        payment_object: "service",
        tax: "none",
      },
    ],
  };
  const receipt = JSON.stringify(receiptObj);
  const shpParam = `Shp_code=${CODE}`;
  const signStr = `${CONF.MERCHANT}:${outSum}:${invId}:${receipt}:${CONF.PASS1}:${shpParam}`;
  const signVal = CryptoJS.MD5(signStr).toString();
  const url = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=${
    CONF.MERCHANT
  }&OutSum=${outSum}&InvId=${invId}&Description=${encodeURIComponent(
    desc
  )}&${shpParam}&Receipt=${encodeURIComponent(
    receipt
  )}&SignatureValue=${signVal}`;
  fetch(`${CONF.SHEET}/order_code/${CODE}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { payment_url: url } }),
  });
  window.open(url, "_blank");
}

window.confirmDriver = confirmDriver;

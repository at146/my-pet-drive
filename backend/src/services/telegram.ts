import fetch from "node-fetch";

const BOT_TOKEN = process.env.BOT_TOKEN;
const DRIVERS_CHAT = process.env.DRIVERS_CHAT;
const ADMIN_CHAT = process.env.ADMIN_CHAT;

if (!BOT_TOKEN) console.warn("BOT_TOKEN not set; Telegram messages will fail");

async function sendMessage(
  chatId: string | number,
  text: string,
  parse_mode = "HTML",
) {
  if (!BOT_TOKEN) return;
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode }),
    });
  } catch (err) {
    console.error("Telegram send error:", err);
  }
}

// Send Telegram Notifications
export async function notifyAll(order: any, rowNumber: number | null) {
  try {
    // To client - теперь с ссылкой на заказ в формате /route
    const clientLink = `/route?${rowNumber}-${order.order_code}`;
    await sendMessage(
      order.telegram_id,
      `Ваш заказ №${order.order_code} принят!\n\nМаршрут: ${order.departure_address} → ${order.destination_address}\nРасстояние: ${order.distance_km} км\nДата: ${order.trip_date} в ${order.trip_time}\n\nОжидайте откликов водителей в течение 15 минут.\n\nСсылка на ваш заказ: https://мояпередержка.рф${clientLink}`,
    );
    console.log("✓ Notification sent to client");

    // To drivers
    const driverLink = `https://xn--80ahcabg2akskmd2q.xn--p1ai/order?${rowNumber}-${order.order_code}`;
    const driversChat = DRIVERS_CHAT || order.drivers_chat || "";
    if (driversChat) {
      await sendMessage(
        driversChat,
        `Новый заказ №${order.order_code}\n\nОткуда: ${
          order.departure_address
        }\nКуда: ${order.destination_address}\nРасстояние: ${
          order.distance_km
        } км\nЖивотное: ${order.animal_type}, ${order.weight_kg}кг\nДата: ${
          order.trip_date
        } в ${order.trip_time}\nВыплата: ${order.driver_cost}₽\n${
          order.mssg_cl ? `\nКомментарий: ${order.mssg_cl}` : ""
        }\n\n<a href="${driverLink}">Откликнуться на заказ</a>`,
      );
      console.log("✓ Notification sent to drivers");
    }

    // To admin
    const adminChat = ADMIN_CHAT || order.admin_chat || "";
    if (adminChat) {
      await sendMessage(
        adminChat,
        `Новый заказ №${order.order_code}\nКлиент: ${order.client_name} (@${order.client_username})\nМаршрут: ${order.departure_address} → ${order.destination_address}\nСтоимость: ${order.total_cost}₽`,
      );
      console.log("✓ Notification sent to admin");
    }
  } catch (err) {
    console.error("notifyAll error:", err);
  }
}

export async function notifyDriverResponse(
  order: any,
  rowNumber: number | null,
  resp: any,
) {
  try {
    const link = `https://xn--80ahcabg2akskmd2q.xn--p1ai/route?${rowNumber}-${order.order_code}`;

    // Client message
    // Для клиента: первое имя водителя, марка авто, комментарий и стоимость с комиссией 21%
    const clientMsg =
      `<b>Новый отклик по заказу №${order.order_code}</b>\n` +
      `Водитель: ${resp.first_name}\n` +
      `Марка авто: ${resp.car_brand || "—"}\n` +
      `Комментарий: ${resp.comment || "—"}\n` +
      `Сумма с комиссией: ${resp.cost_with_com}₽\n` +
      `<a href="${link}">Подтвердить предложение</a>`;

    await sendMessage(order.telegram_id, clientMsg);

    // Admin message
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

    if (ADMIN_CHAT) await sendMessage(ADMIN_CHAT, adminMsg);

    // Drivers chat
    // Для чата водителей: стандартно
    if (DRIVERS_CHAT) {
      await sendMessage(
        DRIVERS_CHAT,
        `По заказу №${order.order_code} +1 новый отклик`,
      );
    }
  } catch (err) {
    console.error("notifyDriverResponse error:", err);
  }
}

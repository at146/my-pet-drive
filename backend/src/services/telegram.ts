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
      `Ваш заказ №${order.order_code} принят!\n\n
      Маршрут: ${order.departure_address} → ${order.destination_address}\n\
      Расстояние: ${order.distance_km} км\n
      Дата: ${order.trip_date} в ${order.trip_time}\n\n
      Ожидайте откликов водителей в течение 15 минут.\n\n
      Ссылка на ваш заказ: https://мояпередержка.рф${clientLink}`,
    );
    console.log("✓ Notification sent to client");

    // To drivers
    const driverLink = `https://xn--80ahcabg2akskmd2q.xn--p1ai/order?${rowNumber}-${order.order_code}`;
    const driversChat = DRIVERS_CHAT || order.drivers_chat || "";
    if (driversChat) {
      await sendMessage(
        driversChat,
        `Новый заказ №${order.order_code}\n\n
        Откуда: ${order.departure_address}\n
        Куда: ${order.destination_address}\n
        Расстояние: ${order.distance_km} км\n
        Животное: ${order.animal_type}, ${order.weight_kg}кг\n
        Дата: ${order.trip_date} в ${order.trip_time}\n
        Выплата: ${order.driver_cost}₽\n\n
        ${order.mssg_cl ? `\nКомментарий: ${order.mssg_cl}` : ""}\n\n
        <a href="${driverLink}">Откликнуться на заказ</a>`,
      );
      console.log("✓ Notification sent to drivers");
    }

    // To admin
    const adminChat = ADMIN_CHAT || order.admin_chat || "";
    if (adminChat) {
      await sendMessage(
        adminChat,
        `Новый заказ №${order.order_code}\n
        Клиент: ${order.client_name} (@${order.client_username})\n
        Маршрут: ${order.departure_address} → ${order.destination_address}\n
        Стоимость: ${order.total_cost}₽`,
      );
      console.log("✓ Notification sent to admin");
    }
  } catch (err) {
    console.error("notifyAll error:", err);
  }
}

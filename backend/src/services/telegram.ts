import fetch from "node-fetch";

const BOT_TOKEN = process.env.BOT_TOKEN;
const DRIVERS_CHAT = process.env.DRIVERS_CHAT;
const ADMIN_CHAT = process.env.ADMIN_CHAT;

if (!BOT_TOKEN) console.warn("BOT_TOKEN not set; Telegram messages will fail");

async function sendMessage(chatId: string | number, text: string, parse_mode = "HTML") {
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

export async function notifyAll(order: any, rowNumber: number | null) {
	try {
		// To client
		const clientLink = `/route?${rowNumber}-${order.order_code}`;
		await sendMessage(order.telegram_id, `Ваш заказ №${order.order_code} принят!\nМаршрут: ${order.departure_address} → ${order.destination_address}\nРасстояние: ${order.distance_km} км\nДата: ${order.trip_date} в ${order.trip_time}\nСсылка на ваш заказ: https://мояпередержка.рф${clientLink}`);

		// To drivers
		const driverLink = `https://xn--80ahcabg2akskmd2q.xn--p1ai/order?${rowNumber}-${order.order_code}`;
		const driversChat = DRIVERS_CHAT || order.drivers_chat || "";
		if (driversChat) {
			await sendMessage(driversChat, `Новый заказ №${order.order_code}\nОткуда: ${order.departure_address}\nКуда: ${order.destination_address}\nРасстояние: ${order.distance_km} км\nЖивотное: ${order.animal_type}, ${order.weight_kg}кг\nДата: ${order.trip_date} в ${order.trip_time}\nВыплата: ${order.driver_cost}₽\n${order.mssg_cl ? "\nКомментарий: " + order.mssg_cl : ""}\n<a href=\"${driverLink}\">Откликнуться на заказ</a>`);
		}

		// To admin
		const adminChat = ADMIN_CHAT || order.admin_chat || "";
		if (adminChat) {
			await sendMessage(adminChat, `Новый заказ №${order.order_code}\nКлиент: ${order.client_name} (@${order.client_username})\nМаршрут: ${order.departure_address} → ${order.destination_address}\nСтоимость: ${order.total_cost}₽`);
		}
	} catch (err) {
		console.error("notifyAll error:", err);
	}
}

export async function sendTelegram(text: string) {
	if (!BOT_TOKEN) return;
	const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
	try {
		await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ chat_id: ADMIN_CHAT || "", text }),
		});
	} catch (err) {
		console.error("Telegram send error:", err);
	}
}


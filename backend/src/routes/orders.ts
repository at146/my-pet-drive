import { Router } from "express";
import { updateSheet, createSheetOrder } from "../services/sheetdb.js";
import { sendTelegram } from "../services/telegram.js";

const router = Router();

router.post("/create-order", async (req, res) => {
    try {
        const { from, to, distance } = req.body;

        // 🔐 Recalculate price server-side
        const price = distance * 25; // Example formula

        // Save to DB
        const order = await createSheetOrder({ from, to, price });

        // Send Telegram message
        await sendTelegram(
            `🚖 New order: ${from} → ${to}\nPrice: ${price} ₽\nID: ${order.id}`
        );

        res.json({
            success: true,
            orderId: order.id,
            price
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;

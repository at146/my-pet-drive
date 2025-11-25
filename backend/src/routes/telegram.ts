import { Router } from "express";
import { getOrderByCode } from "../services/sheetdb";
import {
  notifyAdmin,
  notifyClient,
  notifyDriverResponse,
  notifyDriversChat,
} from "../services/telegram";

const router = Router();

/**
 * POST /api/telegram
 * body: { order_code, row_number, resp }
 */
router.post("/telegram", async (req, res) => {
  try {
    const { order_code, row_number, resp } = req.body || {};
    if (!order_code || !resp) {
      return res.status(400).json({ error: "Missing order_code or resp" });
    }

    const order = await getOrderByCode(order_code);
    if (!order) return res.status(404).json({ error: "Order not found" });

    try {
      await notifyDriverResponse(order, row_number || null, resp);
    } catch (err) {
      console.error("notifyDriverResponse failed:", err);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/telegram/notification/client", async (req, res) => {
  try {
    const { chat_id, text } = req.body || {};
    if (!chat_id || !text) {
      return res.status(400).json({ error: "Missing chat_id or text" });
    }
    try {
      await notifyClient(chat_id, text);
    } catch (err) {
      console.error("notifyClient failed:", err);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/telegram/notification/admin", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }
    try {
      await notifyAdmin(text);
    } catch (err) {
      console.error("notifyAdmin failed:", err);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/telegram/notification/drivers-chat", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: "Missing text" });
    }
    try {
      await notifyDriversChat(text);
    } catch (err) {
      console.error("notifyDriversChat failed:", err);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

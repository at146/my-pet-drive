import { Router } from "express";
import {
  notifyAdmin,
  notifyClient,
  notifyDriversChat,
} from "../services/telegram";

const router = Router();

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

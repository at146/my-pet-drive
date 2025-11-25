import { Router } from "express";
import { getOrderByCode } from "../services/sheetdb";
import { notifyDriverResponse } from "../services/telegram";

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

export default router;

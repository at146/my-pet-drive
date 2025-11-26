import { Router } from "express";
import {
  createSheetOrder,
  getAllOrders,
  getOrderByCode,
  updateOrder,
} from "../services/sheetdb";
import { notifyAll } from "../services/telegram";

const router = Router();

/**
 * Endpoint to create a full order.
 * Expects the frontend to send the same object that was previously posted directly to SheetDB.
 */
router.post("/orders", async (req, res) => {
  try {
    // TODO: сделать защиту от подмены цены клиентом
    const order = req.body;
    if (!order || !order.order_code) {
      return res.status(400).json({ error: "Invalid order payload" });
    }

    // Save to SheetDB
    await createSheetOrder(order);

    // Try to find row number (may require a short delay on SheetDB side)
    const rowNumber = 1;
    // let rowNumber = null;
    // try {
    //   rowNumber = await findOrderRowNumber(order.order_code);
    // } catch (err) {
    //   console.warn("Could not determine row number:", err);
    // }
    // console.log("✓ Row number:", rowNumber);

    // Send Telegram notifications (client/drivers/admin)
    try {
      await notifyAll(order, rowNumber);
    } catch (err) {
      console.error("Telegram notify error:", err);
    }

    return res.json({
      success: true,
      order_code: order.order_code,
      row_number: rowNumber,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/order/:orderCode
 * Returns a single order by order_code
 */
router.get("/orders/:orderCode", async (req, res) => {
  try {
    const { orderCode } = req.params;
    const order = await getOrderByCode(orderCode);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/orders
 * Returns all orders from SheetDB
 */
router.get("/orders", async (_req, res) => {
  try {
    const orders = await getAllOrders();
    return res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /api/order/:orderCode
 * Updates a single order with the provided data
 * body: { status?, driver_responses?, ... }
 */
router.patch("/orders/:orderCode", async (req, res) => {
  try {
    const { orderCode } = req.params;
    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    await updateOrder(orderCode, updates);
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

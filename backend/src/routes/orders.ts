import { Router } from "express";
import { createSheetOrder, findOrderRowNumber } from "../services/sheetdb";
import { notifyAll } from "../services/telegram";

const router = Router();

/**
 * Endpoint to create a full order.
 * Expects the frontend to send the same object that was previously posted directly to SheetDB.
 */
router.post("/create-order", async (req, res) => {
  try {
    const order = req.body;
    if (!order || !order.order_code) {
      return res.status(400).json({ error: "Invalid order payload" });
    }

    // Save to SheetDB
    await createSheetOrder(order);

    // Try to find row number (may require a short delay on SheetDB side)
    let rowNumber = null;
    try {
      rowNumber = await findOrderRowNumber(order.order_code);
    } catch (err) {
      console.warn("Could not determine row number:", err);
    }
    console.log("✓ Row number:", rowNumber);

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

export default router;

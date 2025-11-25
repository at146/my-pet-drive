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
      // a couple attempts with small delay to allow SheetDB to update
      for (let i = 0; i < 5; i++) {
        rowNumber = await findOrderRowNumber(order.order_code);
        if (rowNumber) break;
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (err) {
      console.warn("Could not determine row number:", err);
    }

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

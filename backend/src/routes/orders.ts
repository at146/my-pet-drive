import { Router } from "express";
import {
  calculateCost,
  generateOrderCode,
  stripPhone,
} from "../services/order";
import {
  createSheetOrder,
  getAllOrders,
  getOrderByCode,
  updateOrder,
} from "../services/sheetdb";
import { notifyAll } from "../services/telegram";

const router = Router();

/**
 * POST /api/orders
 * body: { ...order data... }
 * Endpoint to create a full order.
 * Expects the frontend to send the same object that was previously posted directly to SheetDB.
 */
router.post("/orders", async (req, res) => {
  try {
    // TODO: сделать защиту от подмены цены клиентом
    const order = req.body;
    if (
      !order ||
      Object.keys(order).length === 0 ||
      (order.tariff !== "eco" &&
        order.tariff !== "opti" &&
        order.tariff !== "maxi")
    ) {
      return res.status(400).json({ error: "Invalid order payload" });
    }

    const routeData = JSON.parse(order.routeData);
    const userData = JSON.parse(order.userData);

    order.order_code = generateOrderCode();
    const timestamp = new Date().toISOString();
    order.created_at = timestamp;
    const phoneStripped = stripPhone(order.client_phone);
    order.client_phone = phoneStripped;
    const costs = calculateCost(order.tariff, routeData.distance);
    order.total_cost = costs.totalCost;
    order.driver_cost = costs.driverCost;
    order.telegram_id = userData.id;
    order.client_name = userData.first_name;
    order.client_username = userData.username || "";
    order.approve = `✓ ; ${timestamp} ; ${order.userIP} ; ${userData.id}`;
    order.driver_responses = "[]";
    order.status = "ОЖИДАНИЕ_ОТКЛИКОВ";
    order.departure_address = routeData.departure;
    order.destination_address = routeData.destination;
    order.distance_km = routeData.distance;

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
 * POST /api/orders/calculate-cost
 * body: { tariff, distance_km }
 * Returns calculated cost based on tariff and distance
 */
router.post("/orders/calculate-cost", (req, res) => {
  try {
    const { tariff, distance_km } = req.body;
    if (
      !tariff ||
      !distance_km ||
      tariff === "" ||
      distance_km === "" ||
      (tariff !== "eco" && tariff !== "opti" && tariff !== "maxi")
    ) {
      return res.status(400).json({ error: "Missing tariff or distance_km" });
    }

    const costs = calculateCost(tariff, distance_km);
    return res.json(costs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/orders/update-tariff-costs", async (req, res) => {
  try {
    const { distance_km } = req.body;
    if (!distance_km) {
      return res.status(400).json({ error: "Missing distance_km" });
    }

    return res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/orders/:orderCode
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

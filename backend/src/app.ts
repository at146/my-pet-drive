import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

import ordersRouter from "./routes/orders";
import paymentRouter from "./routes/payment";
import telegramRouter from "./routes/telegram";

const app = express();
const corsMiddleware = cors();
app.use(corsMiddleware);

const jsonMiddleware = express.json();
app.use(jsonMiddleware);

// Routes
app.use("/api", ordersRouter);
app.use("/api", paymentRouter);
app.use("/api", telegramRouter);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

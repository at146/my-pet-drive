import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

import ordersRouter from "./routes/orders";
import paymentRouter from "./routes/payment";
import telegramRouter from "./routes/telegram";
import utilsRouter from "./routes/utils";

const allCorsOrigins = process.env.BACKEND_CORS_ORIGINS
  ? process.env.BACKEND_CORS_ORIGINS.split(",").map((o) => o.trim())
  : [];

const app = express();
app.use(cors({ origin: allCorsOrigins }));

const jsonMiddleware = express.json();
app.use(jsonMiddleware);

// Routes
app.use("/api", ordersRouter);
app.use("/api", paymentRouter);
app.use("/api", telegramRouter);
app.use("/api", utilsRouter);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

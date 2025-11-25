import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import ordersRouter from "./routes/orders";
import paymentRouter from "./routes/payment";


const app = express();
const corsMiddleware = cors()
app.use(corsMiddleware);

const jsonMiddleware = express.json();
app.use(jsonMiddleware);

// Routes
app.use("/api", ordersRouter);
app.use("/api", paymentRouter);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});

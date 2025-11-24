import { Router } from "express";
import crypto from "crypto";

const router = Router();

router.post("/payment-link", (req, res) => {
    const { amount, orderId } = req.body;

    const login = process.env.ROBOKASSA_LOGIN!;
    const pass1 = process.env.ROBOKASSA_PASS1!;

    const signature = crypto
        .createHash("md5")
        .update(`${login}:${amount}:${orderId}:${pass1}`)
        .digest("hex");

    const url = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=${login}&OutSum=${amount}&InvId=${orderId}&SignatureValue=${signature}`;

    res.json({ url });
});

export default router;

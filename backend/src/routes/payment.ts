import CryptoJS from "crypto-js";
import { Router } from "express";

const router = Router();

router.post("/payment/payment-link", (req, res) => {
  const { sum, orderId } = req.body || {};
  if (!sum || !orderId) {
    return res.status(400).json({ error: "Missing sum or orderId" });
  }
  // TODO: проверять на не пустое значение при старте
  const merchant = process.env.MERCHANT!;
  const pass1 = process.env.PASS1!;

  const outSum = sum.toFixed(2);
  const invId = Math.floor(1e9 + Math.random() * 9e9);
  const desc = "Поездка в зоотакси MyPetDrive";
  const receiptObj = {
    sno: "usn_income",
    items: [
      {
        name: desc,
        quantity: 1,
        sum: sum,
        payment_method: "full_payment",
        payment_object: "service",
        tax: "none",
      },
    ],
  };

  const receipt = JSON.stringify(receiptObj);
  const shpParam = `Shp_code=${orderId}`;
  const signStr = `${merchant}:${outSum}:${invId}:${receipt}:${pass1}:${shpParam}`;
  const signVal = CryptoJS.MD5(signStr).toString(); // по умолчанию hex
  // TODO: возможно заменить CryptoJS на crypto
  // const signVal = crypto.createHash("md5").update(signStr).digest("hex");
  const url = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=${merchant}&OutSum=${outSum}&InvId=${invId}&Description=${encodeURIComponent(desc)}&${shpParam}&Receipt=${encodeURIComponent(receipt)}&SignatureValue=${signVal}`;
  res.json({ url });
});

export default router;

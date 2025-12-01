import { Router } from "express";

const router = Router();

router.get("/utils/health-check", async (_req, res) => {
  try {
    return res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

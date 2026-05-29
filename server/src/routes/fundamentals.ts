import { Router, Request, Response } from "express";
import { getStockFundamentals } from "../services/fundamentals";

const router = Router();

// GET /api/fundamentals/:symbol  (e.g. /api/fundamentals/RELIANCE)
router.get("/:symbol", async (req: Request, res: Response) => {
  const { symbol } = req.params;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    const data = await getStockFundamentals(symbol.toUpperCase());
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: err.message ?? "Failed to fetch fundamentals" });
  }
});

export default router;

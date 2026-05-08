import { Router, Request, Response } from "express";
import { kiteService } from "../services/kite";

const router = Router();

// GET /api/quotes?symbols=NSE:RELIANCE,NSE:TCS
router.get("/", async (req: Request, res: Response) => {
  const { symbols } = req.query as { symbols?: string };
  if (!symbols) return res.status(400).json({ error: "symbols required" });

  try {
    const list = symbols.split(",").map((s) => s.trim());
    const data = await kiteService.getQuotes(list);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quotes/history/:token?interval=day&days=365
router.get("/history/:token", async (req: Request, res: Response) => {
  const token = parseInt(req.params.token);
  const interval = (req.query.interval as string) || "day";
  const days = parseInt((req.query.days as string) || "180");

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  try {
    const data = await kiteService.getHistoricalData(token, interval, from, to);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quotes/instruments/:exchange — search instruments
router.get("/instruments/:exchange", async (req: Request, res: Response) => {
  const { exchange } = req.params;
  const { q } = req.query as { q?: string };

  try {
    const instruments = await kiteService.getInstruments(exchange.toUpperCase());
    if (q) {
      const query = q.toUpperCase();
      const filtered = instruments
        .filter((i: any) => i.tradingsymbol.includes(query))
        .slice(0, 50);
      return res.json(filtered);
    }
    res.json(instruments.slice(0, 200));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import { Router, Request, Response } from "express";
import { computeSignal } from "../services/signals";
import { kiteService, isKiteAuthError } from "../services/kite";

const router = Router();

const cache: Record<string, { data: any; at: number }> = {};
const TTL = 60_000; // 1 minute cache

router.get("/:underlying", async (req: Request, res: Response) => {
  const underlying = req.params.underlying.toUpperCase();

  if (cache[underlying] && Date.now() - cache[underlying].at < TTL) {
    return res.json(cache[underlying].data);
  }

  try {
    const signal = await computeSignal(underlying);
    cache[underlying] = { data: signal, at: Date.now() };
    res.json(signal);
  } catch (err: any) {
    if (isKiteAuthError(err)) {
      kiteService.clearSession();
      return res.status(401).json({ error: err.message, kiteAuthExpired: true });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;

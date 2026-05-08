import { Router, Request, Response } from "express";
import { kiteService } from "../services/kite";

const router = Router();

interface Instrument {
  instrument_token: number;
  tradingsymbol: string;
  name: string;
  expiry: string;
  strike: number;
  instrument_type: string; // CE or PE
  segment: string;
  exchange: string;
  lot_size: number;
}

// GET /api/options/:underlying  e.g. /api/options/NIFTY or /api/options/BANKNIFTY
router.get("/:underlying", async (req: Request, res: Response) => {
  const underlying = req.params.underlying.toUpperCase();
  const { expiry } = req.query as { expiry?: string };

  try {
    const instruments: Instrument[] = await kiteService.getInstruments("NFO");

    // Filter options for this underlying
    const options = instruments.filter(
      (i) =>
        i.name === underlying &&
        (i.instrument_type === "CE" || i.instrument_type === "PE")
    );

    // Get unique expiries sorted ascending
    const expiries = [
      ...new Set(options.map((i) => i.expiry).filter(Boolean)),
    ].sort();

    const selectedExpiry = expiry || expiries[0];

    const chain = options.filter((i) => i.expiry === selectedExpiry);

    // Group by strike
    const strikeMap: Record<number, { CE?: any; PE?: any }> = {};
    chain.forEach((i) => {
      if (!strikeMap[i.strike]) strikeMap[i.strike] = {};
      if (i.instrument_type === "CE") strikeMap[i.strike].CE = i;
      else strikeMap[i.strike].PE = i;
    });

    const strikes = Object.keys(strikeMap)
      .map(Number)
      .sort((a, b) => a - b);

    // Get quotes for all chain instruments
    const symbols = chain.map((i) => `NFO:${i.tradingsymbol}`);
    let quotes: any = {};

    // Kite allows max 500 instruments per quote call
    const CHUNK = 400;
    for (let i = 0; i < symbols.length; i += CHUNK) {
      const chunk = symbols.slice(i, i + CHUNK);
      if (chunk.length > 0) {
        const q = await kiteService.getQuotes(chunk);
        quotes = { ...quotes, ...q };
      }
    }

    const chainData = strikes.map((strike) => {
      const ce = strikeMap[strike].CE;
      const pe = strikeMap[strike].PE;
      const ceKey = ce ? `NFO:${ce.tradingsymbol}` : null;
      const peKey = pe ? `NFO:${pe.tradingsymbol}` : null;

      return {
        strike,
        CE: ce
          ? {
              token: ce.instrument_token,
              symbol: ce.tradingsymbol,
              ltp: quotes[ceKey!]?.last_price ?? 0,
              oi: quotes[ceKey!]?.oi ?? 0,
              oiChange: quotes[ceKey!]?.oi_day_change ?? 0,
              volume: quotes[ceKey!]?.volume ?? 0,
              iv: quotes[ceKey!]?.ohlc ? null : null,
              bid: quotes[ceKey!]?.depth?.buy?.[0]?.price ?? 0,
              ask: quotes[ceKey!]?.depth?.sell?.[0]?.price ?? 0,
              lotSize: ce.lot_size,
            }
          : null,
        PE: pe
          ? {
              token: pe.instrument_token,
              symbol: pe.tradingsymbol,
              ltp: quotes[peKey!]?.last_price ?? 0,
              oi: quotes[peKey!]?.oi ?? 0,
              oiChange: quotes[peKey!]?.oi_day_change ?? 0,
              volume: quotes[peKey!]?.volume ?? 0,
              bid: quotes[peKey!]?.depth?.buy?.[0]?.price ?? 0,
              ask: quotes[peKey!]?.depth?.sell?.[0]?.price ?? 0,
              lotSize: pe.lot_size,
            }
          : null,
      };
    });

    res.json({ expiries, selectedExpiry, strikes: chainData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

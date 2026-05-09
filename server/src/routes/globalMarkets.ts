import { Router, Request, Response } from "express";
import { kiteService } from "../services/kite";

const router = Router();

const GLOBAL_SYMBOLS = [
  { symbol: "^GSPC",  name: "S&P 500",     exchange: "NYSE"   },
  { symbol: "^IXIC",  name: "NASDAQ",       exchange: "NASDAQ" },
  { symbol: "^DJI",   name: "DOW JONES",    exchange: "NYSE"   },
  { symbol: "^FTSE",  name: "FTSE 100",     exchange: "LSE"    },
  { symbol: "^N225",  name: "NIKKEI 225",   exchange: "TSE"    },
  { symbol: "^HSI",   name: "HANG SENG",    exchange: "HKEX"   },
  { symbol: "^GDAXI", name: "DAX",          exchange: "XETRA"  },
  { symbol: "^SGXNIFTY", name: "SGX NIFTY", exchange: "SGX"   },
];

let globalCache: { data: any[]; at: number } | null = null;
const GLOBAL_TTL = 60_000;

let futuresCache: { data: any[]; at: number } | null = null;
const FUTURES_TTL = 5 * 60_000;

// GET /api/market/global
router.get("/global", async (_req: Request, res: Response) => {
  if (globalCache && Date.now() - globalCache.at < GLOBAL_TTL) {
    return res.json(globalCache.data);
  }

  try {
    const symbols = GLOBAL_SYMBOLS.map((s) => s.symbol).join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`;

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    if (!resp.ok) throw new Error(`Yahoo Finance HTTP ${resp.status}`);

    const json = await resp.json() as any;
    const quotes: any[] = json.quoteResponse?.result ?? [];

    const data = GLOBAL_SYMBOLS.map(({ symbol, name, exchange }) => {
      const q = quotes.find((r: any) => r.symbol === symbol);
      return {
        symbol,
        name,
        exchange,
        price:     q?.regularMarketPrice          ?? 0,
        change:    q?.regularMarketChange          ?? 0,
        changePct: q?.regularMarketChangePercent   ?? 0,
      };
    });

    globalCache = { data, at: Date.now() };
    res.json(data);
  } catch (err: any) {
    console.error("[globalMarkets] Yahoo Finance fetch failed:", err.message);
    if (globalCache) return res.json(globalCache.data);
    res.status(502).json({ error: "Could not fetch global indices" });
  }
});

// GET /api/market/futures — near-month NIFTY, BANKNIFTY, FINNIFTY futures
router.get("/futures", async (_req: Request, res: Response) => {
  if (futuresCache && Date.now() - futuresCache.at < FUTURES_TTL) {
    return res.json(futuresCache.data);
  }

  try {
    const instruments: any[] = await kiteService.getInstruments("NFO");

    const NAMES = ["NIFTY", "BANKNIFTY", "FINNIFTY"];
    const data = NAMES.map((name) => {
      const fut = instruments
        .filter((i) => i.name === name && i.instrument_type === "FUT")
        .sort((a, b) => a.expiry.localeCompare(b.expiry))[0];
      if (!fut) return null;
      return {
        token:    fut.instrument_token as number,
        symbol:   fut.tradingsymbol   as string,
        name:     `${name} FUT`,
        exchange: "NFO",
        expiry:   fut.expiry          as string,
      };
    }).filter(Boolean);

    futuresCache = { data, at: Date.now() };
    res.json(data);
  } catch (err: any) {
    if (futuresCache) return res.json(futuresCache.data);
    res.status(500).json({ error: err.message });
  }
});

export default router;

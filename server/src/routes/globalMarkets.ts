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

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

async function fetchYFChart(symbol: string): Promise<{ price: number; change: number; changePct: number }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
  const resp = await fetch(url, { headers: YF_HEADERS });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json() as any;
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error("no meta");
  const price = meta.regularMarketPrice ?? 0;
  const prev  = meta.previousClose ?? meta.chartPreviousClose ?? 0;
  const change = prev > 0 ? price - prev : 0;
  const changePct = prev > 0 ? (change / prev) * 100 : 0;
  return { price, change, changePct };
}

// GET /api/market/global
router.get("/global", async (_req: Request, res: Response) => {
  if (globalCache && Date.now() - globalCache.at < GLOBAL_TTL) {
    return res.json(globalCache.data);
  }

  try {
    const results = await Promise.allSettled(
      GLOBAL_SYMBOLS.map(async ({ symbol, name, exchange }) => {
        const q = await fetchYFChart(symbol);
        return { symbol, name, exchange, ...q };
      })
    );

    const data = results.map((r, i) => {
      const { symbol, name, exchange } = GLOBAL_SYMBOLS[i];
      if (r.status === "fulfilled") return r.value;
      // Keep stale price for failed symbols
      const stale = globalCache?.data.find((d) => d.symbol === symbol);
      return stale ?? { symbol, name, exchange, price: 0, change: 0, changePct: 0 };
    });

    globalCache = { data, at: Date.now() };
    res.json(data);
  } catch (err: any) {
    console.error("[globalMarkets] fetch failed:", err.message);
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

    const toExpStr = (d: any): string =>
      d instanceof Date ? d.toISOString().split("T")[0] : String(d ?? "").split("T")[0];

    const NAMES = ["NIFTY", "BANKNIFTY", "FINNIFTY"];
    const data = NAMES.map((name) => {
      const fut = instruments
        .filter((i: any) => i.name === name && i.instrument_type === "FUT")
        .sort((a: any, b: any) => toExpStr(a.expiry).localeCompare(toExpStr(b.expiry)))[0];
      if (!fut) return null;
      return {
        token:    fut.instrument_token as number,
        symbol:   fut.tradingsymbol   as string,
        name:     `${name} FUT`,
        exchange: "NFO",
        expiry:   toExpStr(fut.expiry),
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

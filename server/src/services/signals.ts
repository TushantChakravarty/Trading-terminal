import { kiteService } from "./kite";
import { getNews, NewsItem } from "./news";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Direction = "BULLISH" | "BEARISH" | "NEUTRAL";

export interface SignalResult {
  underlying: string;
  spot: number;
  direction: Direction;
  confidence: number;            // 0–100
  generatedAt: string;

  options: {
    pcr: number;
    pcrSignal: Direction;
    maxPain: number;
    atmStrike: number;
    totalCallOI: number;
    totalPutOI: number;
    topCallWalls: { strike: number; oi: number }[];  // resistance
    topPutWalls:  { strike: number; oi: number }[];  // support
  };

  news: {
    sentiment: Direction;
    score: number;               // positive = bullish, negative = bearish
    highImpact: { title: string; source: string; category: string }[];
  };

  suggestion: {
    action: string;              // e.g. "BUY CALL" | "BUY PUT" | "WAIT"
    strike: number;
    expiry: string;
    reason: string[];
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SPOT_SYMBOLS: Record<string, string> = {
  NIFTY:      "NSE:NIFTY 50",
  BANKNIFTY:  "NSE:NIFTY BANK",
  FINNIFTY:   "NSE:NIFTY FIN SERVICE",
  MIDCPNIFTY: "NSE:NIFTY MIDCAP SELECT",
  SENSEX:     "BSE:SENSEX",
};

const BULLISH_KW = [
  "rally", "surge", "jump", "beat", "record high", "strong growth",
  "rate cut", "stimulus", "gdp beat", "profit rise", "positive", "gain",
];
const BEARISH_KW = [
  "crash", "fall", "drop", "miss", "weak", "rate hike", "default",
  "fraud", "recession", "gdp miss", "loss", "concern", "slump", "sell-off",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function computePCR(
  strikes: { CE: any; PE: any }[]
): { pcr: number; totalCallOI: number; totalPutOI: number } {
  let totalCallOI = 0;
  let totalPutOI  = 0;
  strikes.forEach(({ CE, PE }) => {
    totalCallOI += CE?.oi ?? 0;
    totalPutOI  += PE?.oi ?? 0;
  });
  const pcr = totalCallOI > 0 ? totalPutOI / totalCallOI : 1;
  return { pcr, totalCallOI, totalPutOI };
}

function computeMaxPain(strikes: { strike: number; CE: any; PE: any }[]): number {
  let minPain = Infinity;
  let maxPainStrike = strikes[0]?.strike ?? 0;

  strikes.forEach(({ strike: S }) => {
    let pain = 0;
    strikes.forEach(({ strike: K, CE, PE }) => {
      if (K < S)  pain += (S - K) * (CE?.oi ?? 0);   // ITM calls lose value
      if (K > S)  pain += (K - S) * (PE?.oi ?? 0);   // ITM puts lose value
    });
    if (pain < minPain) { minPain = pain; maxPainStrike = S; }
  });

  return maxPainStrike;
}

function newsScore(items: NewsItem[]): number {
  const recent = items.filter(
    (n) => Date.now() - new Date(n.pubDate).getTime() < 4 * 60 * 60 * 1000  // last 4h
  );
  let score = 0;
  recent.forEach(({ title, snippet, impact }) => {
    const text  = (title + " " + snippet).toLowerCase();
    const mult  = impact === "HIGH" ? 3 : impact === "MEDIUM" ? 1.5 : 0.5;
    const bull  = BULLISH_KW.filter((kw) => text.includes(kw)).length;
    const bear  = BEARISH_KW.filter((kw) => text.includes(kw)).length;
    score += (bull - bear) * mult;
  });
  return Math.max(-30, Math.min(30, score));
}

function pcrSignal(pcr: number): Direction {
  if (pcr > 1.2) return "BULLISH";
  if (pcr < 0.8) return "BEARISH";
  return "NEUTRAL";
}

// ── Main compute ──────────────────────────────────────────────────────────────

export async function computeSignal(underlying: string): Promise<SignalResult> {
  const spotSymbol = SPOT_SYMBOLS[underlying];
  if (!spotSymbol) throw new Error(`Unknown underlying: ${underlying}`);

  // 1. Spot price
  const spotQuote = await kiteService.getQuotes([spotSymbol]);
  const spot: number = spotQuote[spotSymbol]?.last_price ?? 0;

  // 2. Options chain instruments (NFO)
  const instruments: any[] = await kiteService.getInstruments("NFO");
  const options = instruments.filter(
    (i) => i.name === underlying && (i.instrument_type === "CE" || i.instrument_type === "PE")
  );

  // expiry is a Date object from kiteconnect — normalise to "YYYY-MM-DD" string
  const toExpStr = (d: any): string =>
    d instanceof Date ? d.toISOString().split("T")[0] : String(d ?? "").split("T")[0];

  const expiries = [...new Set(options.map((i: any) => toExpStr(i.expiry)).filter(Boolean))].sort();
  const nearExpiry = expiries[0];
  const chain = options.filter((i: any) => toExpStr(i.expiry) === nearExpiry);

  // 3. Quotes for chain (chunked)
  const symbols = chain.map((i: any) => `NFO:${i.tradingsymbol}`);
  let quotes: any = {};
  const CHUNK = 400;
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const q = await kiteService.getQuotes(symbols.slice(i, i + CHUNK));
    quotes = { ...quotes, ...q };
  }

  // 4. Build strike map
  const strikeMap: Record<number, { CE: any; PE: any }> = {};
  chain.forEach((inst: any) => {
    if (!strikeMap[inst.strike]) strikeMap[inst.strike] = { CE: null, PE: null };
    const key = `NFO:${inst.tradingsymbol}`;
    const q   = quotes[key] ?? {};
    const leg = { oi: q.oi ?? 0, ltp: q.last_price ?? 0, oiChange: q.oi_day_change ?? 0, volume: q.volume ?? 0 };
    if (inst.instrument_type === "CE") strikeMap[inst.strike].CE = leg;
    else                               strikeMap[inst.strike].PE = leg;
  });

  const strikeRows = Object.keys(strikeMap).map(Number).sort((a, b) => a - b)
    .map((strike) => ({ strike, ...strikeMap[strike] }));

  // 5. PCR + Max Pain
  const { pcr, totalCallOI, totalPutOI } = computePCR(strikeRows);
  const maxPain = computeMaxPain(strikeRows);
  const atmStrike = strikeRows.reduce((prev, cur) =>
    Math.abs(cur.strike - spot) < Math.abs(prev.strike - spot) ? cur : prev
  ).strike;

  // Top OI walls
  const topCallWalls = [...strikeRows]
    .sort((a, b) => (b.CE?.oi ?? 0) - (a.CE?.oi ?? 0)).slice(0, 3)
    .map((r) => ({ strike: r.strike, oi: r.CE?.oi ?? 0 }));
  const topPutWalls = [...strikeRows]
    .sort((a, b) => (b.PE?.oi ?? 0) - (a.PE?.oi ?? 0)).slice(0, 3)
    .map((r) => ({ strike: r.strike, oi: r.PE?.oi ?? 0 }));

  // 6. News sentiment
  const allNews  = await getNews();
  const nScore   = newsScore(allNews);
  const highImpact = allNews
    .filter((n) => n.impact === "HIGH")
    .slice(0, 3)
    .map((n) => ({ title: n.title, source: n.source, category: n.category }));

  const newsSentiment: Direction = nScore > 5 ? "BULLISH" : nScore < -5 ? "BEARISH" : "NEUTRAL";

  // 7. Combined score → direction + confidence
  let score = 0;

  // PCR component (-30 to +30)
  score += Math.max(-30, Math.min(30, (pcr - 1) * 60));

  // Max pain component (-15 to +15)
  if (maxPain > 0 && spot > 0) {
    if (spot < maxPain) score += 15;   // spot below max pain → price tends to move up
    else if (spot > maxPain) score -= 15;
  }

  // News component (-30 to +30)
  score += nScore;

  const direction: Direction = score > 8 ? "BULLISH" : score < -8 ? "BEARISH" : "NEUTRAL";
  const confidence = Math.min(95, Math.round(50 + Math.abs(score) * 0.6));

  // 8. Suggestion
  const otmStrike = direction === "BULLISH"
    ? strikeRows.find((r) => r.strike > atmStrike)?.strike ?? atmStrike
    : strikeRows.filter((r) => r.strike < atmStrike).slice(-1)[0]?.strike ?? atmStrike;

  const reasons: string[] = [];
  if (pcr > 1.2) reasons.push(`PCR ${pcr.toFixed(2)} — heavy put OI signals market support`);
  if (pcr < 0.8) reasons.push(`PCR ${pcr.toFixed(2)} — call OI dominance signals caution`);
  reasons.push(`Max pain at ${maxPain.toLocaleString("en-IN")} (spot ${spot > maxPain ? "above" : "below"})`);
  if (topCallWalls[0]) reasons.push(`Resistance at ${topCallWalls[0].strike.toLocaleString("en-IN")} (highest call OI)`);
  if (topPutWalls[0])  reasons.push(`Support at ${topPutWalls[0].strike.toLocaleString("en-IN")} (highest put OI)`);
  if (newsSentiment !== "NEUTRAL") reasons.push(`News sentiment: ${newsSentiment.toLowerCase()}`);

  const suggestion = {
    action:  direction === "BULLISH" ? "BUY CALL"
           : direction === "BEARISH" ? "BUY PUT"
           : "WAIT — no clear edge",
    strike:  direction === "NEUTRAL" ? atmStrike : otmStrike,
    expiry:  nearExpiry,
    reason:  reasons,
  };

  return {
    underlying,
    spot,
    direction,
    confidence,
    generatedAt: new Date().toISOString(),
    options: { pcr, pcrSignal: pcrSignal(pcr), maxPain, atmStrike, totalCallOI, totalPutOI, topCallWalls, topPutWalls },
    news: { sentiment: newsSentiment, score: nScore, highImpact },
    suggestion,
  };
}

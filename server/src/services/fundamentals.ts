// Yahoo Finance quoteSummary — proper crumb-based session flow.
// Yahoo requires: (1) visit finance.yahoo.com to get cookies,
// (2) fetch /v1/test/getcrumb with those cookies to get a crumb string,
// (3) attach both cookie + crumb to every subsequent API call.

export interface QuarterlyResult {
  period: string;
  endDate: string;
  revenue: number;
  netProfit: number;
  eps: number;
  yoyRevenueGrowth: number | null;
  yoyProfitGrowth: number | null;
}

export interface AnnualResult {
  period: string;
  endDate: string;
  revenue: number;
  netProfit: number;
  eps: number;
  yoyRevenueGrowth: number | null;
  yoyProfitGrowth: number | null;
}

export interface StockFundamentals {
  symbol: string;
  name: string;
  marketCap: number;
  pe: number | null;
  forwardPE: number | null;
  eps: number | null;
  pb: number | null;
  bookValue: number | null;
  ltp: number;
  high52W: number | null;
  low52W: number | null;
  dividendYield: number | null;
  quarterly: QuarterlyResult[];
  annual: AnnualResult[];
}

// ── Session management ────────────────────────────────────────────────────────

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const BASE_HEADERS = {
  "User-Agent": UA,
  "Accept-Language": "en-US,en;q=0.9",
};

interface YSession { cookies: string; crumb: string; at: number }
let _session: YSession | null = null;

async function acquireSession(): Promise<YSession> {
  // Step 1 — visit Yahoo Finance to get session cookies
  const homeRes = await fetch("https://finance.yahoo.com/", {
    redirect: "follow",
    headers: {
      ...BASE_HEADERS,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  // getSetCookie() is available in Node 18+ (undici) — fall back to header split
  const rawCookies: string[] =
    typeof (homeRes.headers as any).getSetCookie === "function"
      ? (homeRes.headers as any).getSetCookie()
      : (homeRes.headers.get("set-cookie") ?? "")
          .split(/,(?=\s*[A-Za-z0-9_-]+=)/)
          .filter(Boolean);

  const cookieStr = rawCookies
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  if (!cookieStr) throw new Error("Yahoo: no cookies received from finance.yahoo.com");

  // Step 2 — exchange cookies for a crumb
  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      ...BASE_HEADERS,
      Accept: "*/*",
      Cookie: cookieStr,
      Referer: "https://finance.yahoo.com/",
    },
  });

  if (!crumbRes.ok) throw new Error(`Yahoo crumb endpoint: ${crumbRes.status}`);

  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.startsWith("<") || crumb.length < 3) {
    throw new Error("Yahoo: received invalid crumb");
  }

  console.log("[yahoo] new session acquired, crumb length:", crumb.length);
  return { cookies: cookieStr, crumb, at: Date.now() };
}

async function getSession(force = false): Promise<YSession> {
  if (!force && _session && Date.now() - _session.at < 50 * 60_000) return _session;
  _session = await acquireSession();
  return _session;
}

// ── Yahoo Finance API call ────────────────────────────────────────────────────

const MODULES = [
  "summaryDetail",
  "defaultKeyStatistics",
  "incomeStatementHistoryQuarterly",
  "incomeStatementHistory",
].join(",");

async function callYahoo(yahooSymbol: string, s: YSession): Promise<Response> {
  const url =
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/` +
    `${encodeURIComponent(yahooSymbol)}` +
    `?modules=${MODULES}&crumb=${encodeURIComponent(s.crumb)}&formatted=false`;

  return fetch(url, {
    headers: {
      ...BASE_HEADERS,
      Accept: "application/json, */*",
      Cookie: s.cookies,
      Referer: `https://finance.yahoo.com/quote/${yahooSymbol}/`,
    },
  });
}

async function fetchYahoo(nseSymbol: string): Promise<any> {
  const yahooSym = `${nseSymbol}.NS`;

  let s = await getSession();
  let res = await callYahoo(yahooSym, s);

  // 401 = crumb expired — refresh once and retry
  if (res.status === 401) {
    console.log("[yahoo] 401, refreshing session...");
    s = await getSession(true);
    res = await callYahoo(yahooSym, s);
  }

  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${yahooSym}`);

  const json = (await res.json()) as any;
  if (json?.quoteSummary?.error) {
    const msg = json.quoteSummary.error?.description ?? "Yahoo error";
    throw new Error(msg);
  }

  const result = json?.quoteSummary?.result?.[0];
  if (!result) throw new Error(`No Yahoo data for ${yahooSym}`);
  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function raw(obj: any): number | null {
  if (obj == null) return null;
  const v = typeof obj === "object" ? obj.raw ?? obj : obj;
  return typeof v === "number" && isFinite(v) ? v : null;
}

function epochToDate(obj: any): number {
  if (obj == null) return 0;
  return typeof obj === "object" ? (obj.raw ?? 0) : Number(obj);
}

function quarterLabel(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  let q: string, fy: number;
  if (m <= 3)       { q = "Q4"; fy = y; }
  else if (m <= 6)  { q = "Q1"; fy = y + 1; }
  else if (m <= 9)  { q = "Q2"; fy = y + 1; }
  else              { q = "Q3"; fy = y + 1; }
  return `${q} FY${String(fy).slice(2)}`;
}

function fyLabel(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  return `FY${String(m <= 3 ? y : y + 1).slice(2)}`;
}

function pct(curr: number, prev: number): number | null {
  if (!prev || !curr) return null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

function processQuarterly(rows: any[]): QuarterlyResult[] {
  const out: QuarterlyResult[] = rows.map((r) => {
    const epoch = epochToDate(r.endDate);
    return {
      period:    quarterLabel(epoch),
      endDate:   new Date(epoch * 1000).toISOString().slice(0, 10),
      revenue:   raw(r.totalRevenue)  ?? 0,
      netProfit: raw(r.netIncome)     ?? 0,
      eps:       raw(r.basicEps)      ?? raw(r.dilutedEps) ?? 0,
      yoyRevenueGrowth: null,
      yoyProfitGrowth:  null,
    };
  });
  for (let i = 0; i < out.length; i++) {
    const prev = out[i + 4];
    if (prev) {
      out[i].yoyRevenueGrowth = pct(out[i].revenue,   prev.revenue);
      out[i].yoyProfitGrowth  = pct(out[i].netProfit, prev.netProfit);
    }
  }
  return out.slice(0, 12);
}

function processAnnual(rows: any[]): AnnualResult[] {
  const out: AnnualResult[] = rows.map((r) => {
    const epoch = epochToDate(r.endDate);
    return {
      period:    fyLabel(epoch),
      endDate:   new Date(epoch * 1000).toISOString().slice(0, 10),
      revenue:   raw(r.totalRevenue)  ?? 0,
      netProfit: raw(r.netIncome)     ?? 0,
      eps:       raw(r.basicEps)      ?? raw(r.dilutedEps) ?? 0,
      yoyRevenueGrowth: null,
      yoyProfitGrowth:  null,
    };
  });
  for (let i = 0; i < out.length - 1; i++) {
    out[i].yoyRevenueGrowth = pct(out[i].revenue,   out[i + 1].revenue);
    out[i].yoyProfitGrowth  = pct(out[i].netProfit, out[i + 1].netProfit);
  }
  return out.slice(0, 5);
}

function parseYahoo(symbol: string, y: any): StockFundamentals {
  const sd  = y.summaryDetail          ?? {};
  const ks  = y.defaultKeyStatistics   ?? {};
  const qH  = y.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? [];
  const aH  = y.incomeStatementHistory?.incomeStatementHistory          ?? [];

  return {
    symbol,
    name:          symbol,
    marketCap:     raw(sd.marketCap)      ?? 0,
    pe:            raw(sd.trailingPE),
    forwardPE:     raw(ks.forwardPE),
    eps:           raw(ks.trailingEps),
    pb:            raw(ks.priceToBook),
    bookValue:     raw(ks.bookValue),
    ltp:           raw(sd.regularMarketPrice) ?? raw(sd.previousClose) ?? 0,
    high52W:       raw(sd.fiftyTwoWeekHigh),
    low52W:        raw(sd.fiftyTwoWeekLow),
    dividendYield: raw(sd.dividendYield),
    quarterly:     processQuarterly(qH),
    annual:        processAnnual(aH),
  };
}

// ── Cache & export ────────────────────────────────────────────────────────────

const cache = new Map<string, { data: StockFundamentals; at: number }>();
const CACHE_TTL = 15 * 60_000;

export async function getStockFundamentals(nseSymbol: string): Promise<StockFundamentals> {
  const hit = cache.get(nseSymbol);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  const yahoo = await fetchYahoo(nseSymbol);
  const data  = parseYahoo(nseSymbol, yahoo);
  cache.set(nseSymbol, { data, at: Date.now() });
  return data;
}

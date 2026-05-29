// Yahoo Finance unofficial quoteSummary API — returns INR-denominated fundamentals
// for NSE-listed stocks. No auth required but browser-like headers are needed.

export interface QuarterlyResult {
  period: string;    // e.g. "Q3 FY25"
  endDate: string;   // ISO date
  revenue: number;
  netProfit: number;
  eps: number;
  yoyRevenueGrowth: number | null;
  yoyProfitGrowth: number | null;
}

export interface AnnualResult {
  period: string;    // e.g. "FY25"
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
  // Valuation
  marketCap: number;
  pe: number | null;
  forwardPE: number | null;
  eps: number | null;
  pb: number | null;
  bookValue: number | null;
  // Price
  ltp: number;
  high52W: number | null;
  low52W: number | null;
  dividendYield: number | null;
  // Results
  quarterly: QuarterlyResult[];
  annual: AnnualResult[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function raw(obj: any): number | null {
  if (obj == null) return null;
  const v = typeof obj === "object" ? obj.raw : obj;
  return typeof v === "number" && isFinite(v) ? v : null;
}

// Indian FY runs Apr–Mar. Given a Unix timestamp (seconds), return "Q1 FY25" etc.
function quarterLabel(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  const m = d.getMonth() + 1; // 1–12
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
  const fy = m <= 3 ? y : y + 1;
  return `FY${String(fy).slice(2)}`;
}

function pctChange(curr: number, prev: number): number | null {
  if (!prev || !curr) return null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

const MODULES = [
  "summaryDetail",
  "defaultKeyStatistics",
  "incomeStatementHistoryQuarterly",
  "incomeStatementHistory",
].join(",");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://finance.yahoo.com",
  Referer: "https://finance.yahoo.com/",
};

async function fetchYahoo(yahooSymbol: string): Promise<any> {
  const url =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/` +
    `${encodeURIComponent(yahooSymbol)}?modules=${MODULES}&formatted=false`;

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status} for ${yahooSymbol}`);

  const json = (await res.json()) as any;
  if (json?.quoteSummary?.error) {
    throw new Error(json.quoteSummary.error.description ?? "Yahoo error");
  }
  const result = json?.quoteSummary?.result?.[0];
  if (!result) throw new Error("Empty Yahoo response");
  return result;
}

// ── Process Yahoo response → StockFundamentals ────────────────────────────────

function processQuarterly(raw_: any[]): QuarterlyResult[] {
  const out: QuarterlyResult[] = raw_.map((item) => ({
    period:   quarterLabel(item.endDate?.raw ?? item.endDate),
    endDate:  new Date((item.endDate?.raw ?? item.endDate) * 1000).toISOString().slice(0, 10),
    revenue:  item.totalRevenue?.raw   ?? item.totalRevenue   ?? 0,
    netProfit:item.netIncome?.raw      ?? item.netIncome      ?? 0,
    eps:      item.basicEps?.raw       ?? item.basicEps       ?? 0,
    yoyRevenueGrowth: null,
    yoyProfitGrowth:  null,
  }));

  // Compute YoY growth (each quarter vs same quarter 4 positions earlier)
  for (let i = 0; i < out.length; i++) {
    const prev = out[i + 4];
    if (prev) {
      out[i].yoyRevenueGrowth = pctChange(out[i].revenue,   prev.revenue);
      out[i].yoyProfitGrowth  = pctChange(out[i].netProfit, prev.netProfit);
    }
  }

  return out.slice(0, 12); // last 12 quarters = 3 years
}

function processAnnual(raw_: any[]): AnnualResult[] {
  const out: AnnualResult[] = raw_.map((item) => ({
    period:   fyLabel(item.endDate?.raw ?? item.endDate),
    endDate:  new Date((item.endDate?.raw ?? item.endDate) * 1000).toISOString().slice(0, 10),
    revenue:  item.totalRevenue?.raw ?? item.totalRevenue ?? 0,
    netProfit:item.netIncome?.raw    ?? item.netIncome    ?? 0,
    eps:      item.basicEps?.raw     ?? item.basicEps     ?? 0,
    yoyRevenueGrowth: null,
    yoyProfitGrowth:  null,
  }));

  for (let i = 0; i < out.length - 1; i++) {
    out[i].yoyRevenueGrowth = pctChange(out[i].revenue,   out[i + 1].revenue);
    out[i].yoyProfitGrowth  = pctChange(out[i].netProfit, out[i + 1].netProfit);
  }

  return out.slice(0, 5); // last 5 years
}

function parse(symbol: string, y: any): StockFundamentals {
  const sd  = y.summaryDetail           ?? {};
  const ks  = y.defaultKeyStatistics    ?? {};
  const qHist = (y.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? []) as any[];
  const aHist = (y.incomeStatementHistory?.incomeStatementHistory          ?? []) as any[];

  return {
    symbol,
    name:          ks.enterpriseValue ? symbol : symbol, // name not in these modules
    marketCap:     raw(sd.marketCap)    ?? 0,
    pe:            raw(sd.trailingPE),
    forwardPE:     raw(ks.forwardPE),
    eps:           raw(ks.trailingEps),
    pb:            raw(ks.priceToBook),
    bookValue:     raw(ks.bookValue),
    ltp:           raw(sd.regularMarketPrice) ?? raw(sd.previousClose) ?? 0,
    high52W:       raw(sd.fiftyTwoWeekHigh),
    low52W:        raw(sd.fiftyTwoWeekLow),
    dividendYield: raw(sd.dividendYield),
    quarterly:     processQuarterly(qHist),
    annual:        processAnnual(aHist),
  };
}

// ── Cache & main export ───────────────────────────────────────────────────────

const cache = new Map<string, { data: StockFundamentals; at: number }>();
const CACHE_TTL = 15 * 60_000;

export async function getStockFundamentals(
  nseSymbol: string
): Promise<StockFundamentals> {
  const hit = cache.get(nseSymbol);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  const yahooSymbol = `${nseSymbol}.NS`;

  // Try query1, fall back to query2
  let yahoo: any;
  try {
    yahoo = await fetchYahoo(yahooSymbol);
  } catch {
    const url2 =
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/` +
      `${encodeURIComponent(yahooSymbol)}?modules=${MODULES}&formatted=false`;
    const res = await fetch(url2, { headers: HEADERS });
    if (!res.ok) throw new Error(`Yahoo unavailable (${res.status})`);
    const json = (await res.json()) as any;
    yahoo = json?.quoteSummary?.result?.[0];
    if (!yahoo) throw new Error("No Yahoo data");
  }

  const data = parse(nseSymbol, yahoo);
  cache.set(nseSymbol, { data, at: Date.now() });
  return data;
}

// Fundamentals service — NSE India (primary) + Yahoo Finance (fallback)
//
// Both sources use a cookie-based session (no API key required) but work
// differently on cloud vs local:
//   - NSE India: authoritative for Indian data, requires session cookies
//   - Yahoo Finance: global coverage, requires crumb + cookies
//
// Flow: try NSE first → merge with Yahoo for income statement history →
//       if NSE fails entirely, fall back to Yahoo-only.

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
  source: "NSE" | "Yahoo" | "NSE+Yahoo";
}

// ── Shared UA ─────────────────────────────────────────────────────────────────

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ── NSE India session ─────────────────────────────────────────────────────────
// NSE sets a session cookie on the home page that must be included in all
// subsequent API calls. The cookies expire frequently so we re-acquire every 5 min.

interface NseSession { cookies: string; at: number }
let _nseSession: NseSession | null = null;

async function acquireNseSession(): Promise<NseSession> {
  const res = await fetch("https://www.nseindia.com/", {
    redirect: "follow",
    headers: {
      "User-Agent": UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const rawCookies: string[] =
    typeof (res.headers as any).getSetCookie === "function"
      ? (res.headers as any).getSetCookie()
      : (res.headers.get("set-cookie") ?? "")
          .split(/,(?=\s*[A-Za-z0-9_-]+=)/)
          .filter(Boolean);

  const cookieStr = rawCookies
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  if (!cookieStr) throw new Error("NSE: no cookies from homepage");

  // Warm up the session by hitting the equity page (NSE requires this)
  await fetch("https://www.nseindia.com/market-data/live-equity-market", {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,*/*;q=0.8",
      Cookie: cookieStr,
      Referer: "https://www.nseindia.com/",
    },
  }).catch(() => {/* warmup failure is OK */});

  return { cookies: cookieStr, at: Date.now() };
}

async function getNseSession(): Promise<NseSession> {
  if (_nseSession && Date.now() - _nseSession.at < 5 * 60_000) return _nseSession;
  _nseSession = await acquireNseSession();
  return _nseSession;
}

async function nseGet(path: string): Promise<any> {
  const s = await getNseSession();
  const res = await fetch(`https://www.nseindia.com${path}`, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: s.cookies,
      Referer: "https://www.nseindia.com/",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  // 401/403 = session expired — refresh once
  if (res.status === 401 || res.status === 403) {
    _nseSession = null;
    const s2 = await getNseSession();
    const res2 = await fetch(`https://www.nseindia.com${path}`, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        Cookie: s2.cookies,
        Referer: "https://www.nseindia.com/",
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    if (!res2.ok) throw new Error(`NSE API ${res2.status} for ${path}`);
    return res2.json();
  }

  if (!res.ok) throw new Error(`NSE API ${res.status} for ${path}`);
  return res.json();
}

// ── NSE data parsers ──────────────────────────────────────────────────────────

function parseNseQuote(data: any, symbol: string): Partial<StockFundamentals> {
  const pi  = data?.priceInfo    ?? {};
  const md  = data?.metadata     ?? {};
  const ii  = data?.industryInfo ?? {};
  const sdi = data?.securityInfo ?? {};

  const ltp      = pi.lastPrice       ?? 0;
  const high52W  = pi.weekHighMax     ?? pi["52WeekHigh"] ?? null;
  const low52W   = pi.weekLowMin      ?? pi["52WeekLow"]  ?? null;
  const marketCap = (md.totalMarketCap ?? md.marketCap ?? 0) * 1e7; // NSE gives in ₹Cr, convert to ₹

  // NSE quote-equity also returns P/E and EPS inline
  const pe  = data?.priceInfo?.pEValuation ?? null;
  const eps = pe && ltp ? ltp / pe : null;

  return {
    symbol,
    name:     md.companyName ?? symbol,
    ltp,
    high52W:  high52W  ? Number(high52W)  : null,
    low52W:   low52W   ? Number(low52W)   : null,
    marketCap,
    pe:       pe       ? Number(pe)       : null,
    eps:      eps      ? Number(eps)      : null,
    // NSE doesn't give these directly in quote-equity
    forwardPE:     null,
    pb:            null,
    bookValue:     null,
    dividendYield: null,
  };
}

function quarterLabel(epochSec: number): string {
  const d = new Date(epochSec * 1000);
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  let q: string, fy: number;
  if (m <= 3)      { q = "Q4"; fy = y; }
  else if (m <= 6) { q = "Q1"; fy = y + 1; }
  else if (m <= 9) { q = "Q2"; fy = y + 1; }
  else             { q = "Q3"; fy = y + 1; }
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

// NSE financial-results API returns results array with fromDate, toDate, revenue, pat, eps
function parseNseResults(data: any): { quarterly: QuarterlyResult[]; annual: AnnualResult[] } {
  const rows: any[] = data?.data ?? data?.results ?? [];
  if (!rows.length) return { quarterly: [], annual: [] };

  const quarterly: QuarterlyResult[] = [];
  const annual:    AnnualResult[]    = [];

  for (const r of rows) {
    const toDate  = r.toDate ?? r.xbrlDate ?? "";
    const isAnnual = r.period === "Annual" || r.resultType === "Annual";

    // NSE returns values in ₹Cr — convert to ₹ (multiply by 1e7)
    const revCr  = parseFloat(r.income        ?? r.revenue       ?? "0") || 0;
    const patCr  = parseFloat(r.pat           ?? r.netProfit     ?? "0") || 0;
    const epsVal = parseFloat(r.eps           ?? "0")                   || 0;

    const rev = revCr * 1e7;
    const pat = patCr * 1e7;

    // Parse dd-MMM-yyyy or ISO date
    const epoch = toDate
      ? Math.floor(new Date(toDate.includes("-") && toDate.length <= 11
          ? toDate.split("-").reverse().join("-")   // dd-MMM-yyyy → yyyy-MMM-dd
          : toDate).getTime() / 1000)
      : 0;

    if (isAnnual) {
      annual.push({
        period:   epoch ? fyLabel(epoch)     : toDate,
        endDate:  toDate,
        revenue:  rev, netProfit: pat, eps: epsVal,
        yoyRevenueGrowth: null, yoyProfitGrowth: null,
      });
    } else {
      quarterly.push({
        period:   epoch ? quarterLabel(epoch) : toDate,
        endDate:  toDate,
        revenue:  rev, netProfit: pat, eps: epsVal,
        yoyRevenueGrowth: null, yoyProfitGrowth: null,
      });
    }
  }

  // Compute YoY growth
  for (let i = 0; i < quarterly.length; i++) {
    const prev = quarterly[i + 4];
    if (prev) {
      quarterly[i].yoyRevenueGrowth = pct(quarterly[i].revenue,   prev.revenue);
      quarterly[i].yoyProfitGrowth  = pct(quarterly[i].netProfit, prev.netProfit);
    }
  }
  for (let i = 0; i < annual.length - 1; i++) {
    annual[i].yoyRevenueGrowth = pct(annual[i].revenue,   annual[i + 1].revenue);
    annual[i].yoyProfitGrowth  = pct(annual[i].netProfit, annual[i + 1].netProfit);
  }

  return {
    quarterly: quarterly.slice(0, 12),
    annual:    annual.slice(0, 5),
  };
}

// ── Yahoo Finance session (fallback) ─────────────────────────────────────────

const YAHOO_MODULES = [
  "summaryDetail",
  "defaultKeyStatistics",
  "incomeStatementHistoryQuarterly",
  "incomeStatementHistory",
].join(",");

interface YSession { cookies: string; crumb: string; at: number }
let _yahooSession: YSession | null = null;

async function acquireYahooSession(): Promise<YSession> {
  const homeRes = await fetch("https://finance.yahoo.com/", {
    redirect: "follow",
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

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

  if (!cookieStr) throw new Error("Yahoo: no cookies");

  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "User-Agent": UA, Cookie: cookieStr, Accept: "*/*",
               Referer: "https://finance.yahoo.com/" },
  });
  if (!crumbRes.ok) throw new Error(`Yahoo crumb: ${crumbRes.status}`);

  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.startsWith("<") || crumb.length < 3) throw new Error("Bad Yahoo crumb");

  return { cookies: cookieStr, crumb, at: Date.now() };
}

async function getYahooSession(force = false): Promise<YSession> {
  if (!force && _yahooSession && Date.now() - _yahooSession.at < 50 * 60_000) return _yahooSession;
  _yahooSession = await acquireYahooSession();
  return _yahooSession;
}

async function fetchYahoo(nseSymbol: string): Promise<any> {
  const sym = `${nseSymbol}.NS`;

  const callWith = async (s: YSession) =>
    fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/` +
        `${encodeURIComponent(sym)}?modules=${YAHOO_MODULES}` +
        `&crumb=${encodeURIComponent(s.crumb)}&formatted=false`,
      {
        headers: {
          "User-Agent": UA, Accept: "application/json, */*",
          Cookie: s.cookies, Referer: `https://finance.yahoo.com/quote/${sym}/`,
        },
      }
    );

  let s   = await getYahooSession();
  let res = await callWith(s);
  if (res.status === 401) { s = await getYahooSession(true); res = await callWith(s); }
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);

  const json = (await res.json()) as any;
  if (json?.quoteSummary?.error) throw new Error(json.quoteSummary.error?.description ?? "Yahoo error");
  const result = json?.quoteSummary?.result?.[0];
  if (!result) throw new Error(`No Yahoo data for ${sym}`);
  return result;
}

function rawNum(obj: any): number | null {
  if (obj == null) return null;
  const v = typeof obj === "object" ? obj.raw ?? obj : obj;
  return typeof v === "number" && isFinite(v) ? v : null;
}

function epochOf(obj: any): number {
  if (obj == null) return 0;
  return typeof obj === "object" ? (obj.raw ?? 0) : Number(obj);
}

function parseYahooQuarterly(rows: any[]): QuarterlyResult[] {
  const out: QuarterlyResult[] = rows.map((r) => {
    const ep = epochOf(r.endDate);
    return {
      period:    quarterLabel(ep),
      endDate:   new Date(ep * 1000).toISOString().slice(0, 10),
      revenue:   rawNum(r.totalRevenue)  ?? 0,
      netProfit: rawNum(r.netIncome)     ?? 0,
      eps:       rawNum(r.basicEps)      ?? rawNum(r.dilutedEps) ?? 0,
      yoyRevenueGrowth: null, yoyProfitGrowth: null,
    };
  });
  for (let i = 0; i < out.length; i++) {
    const p = out[i + 4];
    if (p) {
      out[i].yoyRevenueGrowth = pct(out[i].revenue,   p.revenue);
      out[i].yoyProfitGrowth  = pct(out[i].netProfit, p.netProfit);
    }
  }
  return out.slice(0, 12);
}

function parseYahooAnnual(rows: any[]): AnnualResult[] {
  const out: AnnualResult[] = rows.map((r) => {
    const ep = epochOf(r.endDate);
    return {
      period:    fyLabel(ep),
      endDate:   new Date(ep * 1000).toISOString().slice(0, 10),
      revenue:   rawNum(r.totalRevenue)  ?? 0,
      netProfit: rawNum(r.netIncome)     ?? 0,
      eps:       rawNum(r.basicEps)      ?? rawNum(r.dilutedEps) ?? 0,
      yoyRevenueGrowth: null, yoyProfitGrowth: null,
    };
  });
  for (let i = 0; i < out.length - 1; i++) {
    out[i].yoyRevenueGrowth = pct(out[i].revenue,   out[i + 1].revenue);
    out[i].yoyProfitGrowth  = pct(out[i].netProfit, out[i + 1].netProfit);
  }
  return out.slice(0, 5);
}

function parseYahooFundamentals(symbol: string, y: any): Partial<StockFundamentals> {
  const sd = y.summaryDetail        ?? {};
  const ks = y.defaultKeyStatistics ?? {};
  const qH = y.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? [];
  const aH = y.incomeStatementHistory?.incomeStatementHistory          ?? [];

  return {
    symbol,
    name:          symbol,
    marketCap:     rawNum(sd.marketCap)   ?? 0,
    pe:            rawNum(sd.trailingPE),
    forwardPE:     rawNum(ks.forwardPE),
    eps:           rawNum(ks.trailingEps),
    pb:            rawNum(ks.priceToBook),
    bookValue:     rawNum(ks.bookValue),
    ltp:           rawNum(sd.regularMarketPrice) ?? rawNum(sd.previousClose) ?? 0,
    high52W:       rawNum(sd.fiftyTwoWeekHigh),
    low52W:        rawNum(sd.fiftyTwoWeekLow),
    dividendYield: rawNum(sd.dividendYield),
    quarterly:     parseYahooQuarterly(qH),
    annual:        parseYahooAnnual(aH),
  };
}

// ── Main: NSE primary, Yahoo fallback ─────────────────────────────────────────

const cache = new Map<string, { data: StockFundamentals; at: number }>();
const CACHE_TTL = 15 * 60_000;

export async function getStockFundamentals(nseSymbol: string): Promise<StockFundamentals> {
  const hit = cache.get(nseSymbol);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  let data: StockFundamentals;

  // ── Try NSE India first ──────────────────────────────────────────────────
  try {
    const [quoteRaw, resultsRaw] = await Promise.allSettled([
      nseGet(`/api/quote-equity?symbol=${encodeURIComponent(nseSymbol)}`),
      nseGet(`/api/financial-results?symbol=${encodeURIComponent(nseSymbol)}&period=Quarterly`),
    ]);

    if (quoteRaw.status !== "fulfilled") throw quoteRaw.reason;

    const nseQuote   = parseNseQuote(quoteRaw.value, nseSymbol);
    const nseResults = resultsRaw.status === "fulfilled"
      ? parseNseResults(resultsRaw.value)
      : { quarterly: [], annual: [] };

    // If NSE didn't give us income-statement history, try Yahoo for those
    let quarterly = nseResults.quarterly;
    let annual    = nseResults.annual;
    let extraFields: Partial<StockFundamentals> = {};
    let source: StockFundamentals["source"] = "NSE";

    if (!quarterly.length || !annual.length) {
      try {
        const y = await fetchYahoo(nseSymbol);
        const yf = parseYahooFundamentals(nseSymbol, y);
        if (!quarterly.length) quarterly = yf.quarterly ?? [];
        if (!annual.length)    annual    = yf.annual    ?? [];
        extraFields = {
          forwardPE:     yf.forwardPE,
          pb:            yf.pb,
          bookValue:     yf.bookValue,
          dividendYield: yf.dividendYield,
        };
        source = "NSE+Yahoo";
      } catch { /* Yahoo unavailable — use NSE only */ }
    }

    data = {
      symbol:       nseSymbol,
      name:         nseQuote.name ?? nseSymbol,
      marketCap:    nseQuote.marketCap   ?? 0,
      pe:           nseQuote.pe          ?? null,
      eps:          nseQuote.eps         ?? null,
      ltp:          nseQuote.ltp         ?? 0,
      high52W:      nseQuote.high52W     ?? null,
      low52W:       nseQuote.low52W      ?? null,
      forwardPE:    extraFields.forwardPE    ?? null,
      pb:           extraFields.pb           ?? null,
      bookValue:    extraFields.bookValue    ?? null,
      dividendYield:extraFields.dividendYield ?? null,
      quarterly,
      annual,
      source,
    };
  } catch (nseErr) {
    // ── NSE failed — fall back to Yahoo Finance ────────────────────────────
    console.warn(`[fundamentals] NSE failed for ${nseSymbol}: ${(nseErr as Error).message} — trying Yahoo`);
    try {
      const y  = await fetchYahoo(nseSymbol);
      const yf = parseYahooFundamentals(nseSymbol, y);
      data = { ...yf, source: "Yahoo" } as StockFundamentals;
    } catch (yahooErr) {
      throw new Error(
        `Both data sources failed for ${nseSymbol}.\n` +
        `NSE: ${(nseErr as Error).message}\n` +
        `Yahoo: ${(yahooErr as Error).message}`
      );
    }
  }

  cache.set(nseSymbol, { data, at: Date.now() });
  return data;
}

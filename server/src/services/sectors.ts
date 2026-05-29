import { kiteService } from "./kite";
import { getNews } from "./news";
import { config } from "../config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SectorStock {
  symbol: string;
  name: string;
  ltp: number;
  changePct: number;
}

export interface SectorAnalysis {
  id: string;
  name: string;
  shortName: string;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  avgChangePct: number;
  activityScore: number;
  topMovers: SectorStock[];
  newsCount: number;
  keyNews: string[];
  analysis: string;
  catalyst: string;
  tradingAngle: string;
  priceDataAvailable: boolean;
  dataWindow: "2W" | "1D";
}

// ── Sector definitions ────────────────────────────────────────────────────────
// token: Zerodha instrument_token for historical data (14-day candles)
// Only stocks with a confirmed token get 2-week history; others fall back to OHLC

interface StockDef { symbol: string; name: string; token?: number }
interface SectorDef {
  id: string;
  name: string;
  shortName: string;
  keywords: string[];
  stocks: StockDef[];
}

const SECTOR_DEFS: SectorDef[] = [
  {
    id: "IT",
    name: "Information Technology",
    shortName: "IT / TECH",
    keywords: ["it sector","software","tech","infosys","tcs","wipro","hcltech","hcl tech","tech mahindra","ltimindtree","persistent","nasscom","outsourcing","attrition"],
    stocks: [
      { symbol: "NSE:TCS",     name: "TCS",        token: 2953217 },
      { symbol: "NSE:INFY",    name: "INFOSYS",    token: 408065  },
      { symbol: "NSE:WIPRO",   name: "WIPRO",      token: 3787777 },
      { symbol: "NSE:HCLTECH", name: "HCL TECH",   token: 1850625 },
      { symbol: "NSE:TECHM",   name: "TECH M"                     },
      { symbol: "NSE:LTIM",    name: "LTIMindtree"                },
    ],
  },
  {
    id: "BANKING",
    name: "Banking & Finance",
    shortName: "BANKING",
    keywords: ["bank","banking","hdfc","icici","sbi","axis bank","kotak","nbfc","credit growth","loan","deposit","npa","bad loan","rbi","repo"],
    stocks: [
      { symbol: "NSE:HDFCBANK",   name: "HDFC BANK",  token: 341249  },
      { symbol: "NSE:ICICIBANK",  name: "ICICI BANK", token: 1270529 },
      { symbol: "NSE:SBIN",       name: "SBI",        token: 779521  },
      { symbol: "NSE:AXISBANK",   name: "AXIS BANK",  token: 1510401 },
      { symbol: "NSE:KOTAKBANK",  name: "KOTAK BANK", token: 492033  },
      { symbol: "NSE:INDUSINDBK", name: "INDUSIND"                   },
    ],
  },
  {
    id: "PHARMA",
    name: "Pharmaceuticals",
    shortName: "PHARMA",
    keywords: ["pharma","drug","medicine","usfda","fda","api","generic","cipla","sun pharma","dr reddy","biocon","hospital","healthcare","clinical"],
    stocks: [
      { symbol: "NSE:SUNPHARMA",  name: "SUN PHARMA", token: 857857  },
      { symbol: "NSE:DRREDDY",    name: "DR REDDY",   token: 225537  },
      { symbol: "NSE:CIPLA",      name: "CIPLA",      token: 177665  },
      { symbol: "NSE:DIVISLAB",   name: "DIVIS LAB"                  },
      { symbol: "NSE:APOLLOHOSP", name: "APOLLO HSP"                 },
      { symbol: "NSE:LUPIN",      name: "LUPIN"                      },
    ],
  },
  {
    id: "AUTO",
    name: "Automobiles & EV",
    shortName: "AUTO / EV",
    keywords: ["auto","automobile","car","vehicle","ev","electric vehicle","maruti","tata motors","mahindra","bajaj auto","hero motor","tvs","two-wheeler","passenger vehicle"],
    stocks: [
      { symbol: "NSE:MARUTI",     name: "MARUTI",      token: 2815745 },
      { symbol: "NSE:TATAMOTORS", name: "TATA MOTORS", token: 884737  },
      { symbol: "NSE:M&M",        name: "M&M",         token: 519937  },
      { symbol: "NSE:BAJAJ-AUTO", name: "BAJAJ AUTO"                  },
      { symbol: "NSE:EICHERMOT",  name: "EICHER"                      },
      { symbol: "NSE:HEROMOTOCO", name: "HERO MOTO"                   },
    ],
  },
  {
    id: "ENERGY",
    name: "Energy & Oil & Gas",
    shortName: "ENERGY / OIL",
    keywords: ["oil","crude","brent","energy","reliance","ongc","bpcl","petroleum","gas","opec","refinery","ntpc","power","renewable","solar"],
    stocks: [
      { symbol: "NSE:RELIANCE",  name: "RELIANCE", token: 738561  },
      { symbol: "NSE:ONGC",      name: "ONGC",     token: 633601  },
      { symbol: "NSE:BPCL",      name: "BPCL",     token: 134657  },
      { symbol: "NSE:NTPC",      name: "NTPC",     token: 2977281 },
      { symbol: "NSE:POWERGRID", name: "PWR GRID"                 },
      { symbol: "NSE:GAIL",      name: "GAIL"                     },
    ],
  },
  {
    id: "FMCG",
    name: "FMCG & Consumer",
    shortName: "FMCG",
    keywords: ["fmcg","consumer","hindustan unilever","hul","itc","nestle","britannia","dabur","marico","colgate","rural demand","consumption","volume growth"],
    stocks: [
      { symbol: "NSE:HINDUNILVR", name: "HUL",      token: 356865 },
      { symbol: "NSE:ITC",        name: "ITC",       token: 424961 },
      { symbol: "NSE:NESTLEIND",  name: "NESTLE"                  },
      { symbol: "NSE:BRITANNIA",  name: "BRITANNIA", token: 140033 },
      { symbol: "NSE:DABUR",      name: "DABUR"                   },
      { symbol: "NSE:MARICO",     name: "MARICO"                  },
    ],
  },
  {
    id: "METAL",
    name: "Metals & Mining",
    shortName: "METALS",
    keywords: ["metal","steel","aluminium","aluminum","copper","zinc","tata steel","jsw steel","hindalco","coal india","vedanta","iron ore","commodities","lme","china demand"],
    stocks: [
      { symbol: "NSE:TATASTEEL", name: "TATA STEEL", token: 895745  },
      { symbol: "NSE:JSWSTEEL",  name: "JSW STEEL",  token: 3001089 },
      { symbol: "NSE:HINDALCO",  name: "HINDALCO",   token: 348929  },
      { symbol: "NSE:COALINDIA", name: "COAL INDIA", token: 5215745 },
      { symbol: "NSE:VEDL",      name: "VEDANTA"                    },
      { symbol: "NSE:NMDC",      name: "NMDC"                       },
    ],
  },
  {
    id: "REALTY",
    name: "Real Estate",
    shortName: "REALTY",
    keywords: ["realty","real estate","property","housing","dlf","godrej properties","lodha","prestige","home loan","residential","commercial","registration"],
    stocks: [
      { symbol: "NSE:DLF",        name: "DLF",        token: 3492089 },
      { symbol: "NSE:GODREJPROP", name: "GODREJ PROP"               },
      { symbol: "NSE:LODHA",      name: "LODHA"                     },
      { symbol: "NSE:PRESTIGE",   name: "PRESTIGE"                  },
      { symbol: "NSE:OBEROIRLTY", name: "OBEROI"                    },
    ],
  },
  {
    id: "DEFENCE",
    name: "Defence & Aerospace",
    shortName: "DEFENCE",
    keywords: ["defence","defense","military","aerospace","hal","bel","bharat forge","beml","defence order","indigenization","export","weapon"],
    stocks: [
      { symbol: "NSE:HAL",        name: "HAL",         token: 2513409 },
      { symbol: "NSE:BEL",        name: "BEL",         token: 98049   },
      { symbol: "NSE:BHARATFORG", name: "BHARAT FORGE", token: 88801  },
      { symbol: "NSE:BEML",       name: "BEML"                        },
      { symbol: "NSE:COCHINSHIP", name: "COCHIN SHIP"                 },
    ],
  },
];

// ── Groq helper ───────────────────────────────────────────────────────────────

async function callGroq(systemMsg: string, userMsg: string): Promise<string> {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.groqModel,
      messages: [
        { role: "system", content: systemMsg },
        { role: "user",   content: userMsg   },
      ],
      max_tokens: 1200,
      temperature: 0.35,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Groq ${resp.status}: ${body.slice(0, 200)}`);
  }
  const json = (await resp.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (content) return (content as string).trim();
  throw new Error("Unexpected Groq response");
}

function extractJson(raw: string): any {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = stripped.indexOf("[");
  if (start === -1) throw new Error("No JSON array in response");
  const end = stripped.lastIndexOf("]");
  if (end > start) {
    try { return JSON.parse(stripped.slice(start, end + 1)); } catch { /* fall through */ }
  }
  let fragment = stripped.slice(start);
  const stack: string[] = [];
  let inStr = false, esc = false;
  for (const ch of fragment) {
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "[" || ch === "{") stack.push(ch === "[" ? "]" : "}");
    if (ch === "]" || ch === "}") stack.pop();
  }
  fragment = fragment.replace(/,\s*$/, "").replace(/,\s*[\w"]*$/, "");
  return JSON.parse(fragment + stack.reverse().join(""));
}

// ── 2-week historical data ────────────────────────────────────────────────────

async function fetch2WeekChange(token: number): Promise<number | null> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 18); // 18 days covers ~14 trading sessions
  try {
    const candles: any[] = await kiteService.getHistoricalData(token, "day", from, to);
    if (!candles || candles.length < 3) return null;
    const first = candles[0].close;
    const last  = candles[candles.length - 1].close;
    if (!first) return null;
    return ((last - first) / first) * 100;
  } catch {
    return null;
  }
}

// ── News scoring ──────────────────────────────────────────────────────────────

function scoreSectorNews(
  keywords: string[],
  news: Array<{ title: string; snippet: string; impact: string }>
): { score: number; headlines: string[] } {
  const hits: Array<{ headline: string; score: number }> = [];
  for (const item of news) {
    const text = (item.title + " " + item.snippet).toLowerCase();
    if (keywords.some((kw) => text.includes(kw))) {
      const pts = item.impact === "HIGH" ? 3 : item.impact === "MEDIUM" ? 1.5 : 0.5;
      hits.push({ headline: item.title, score: pts });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return {
    score: hits.reduce((s, h) => s + h.score, 0),
    headlines: hits.slice(0, 3).map((h) => h.headline),
  };
}

// ── AI analysis for top sectors ───────────────────────────────────────────────

interface GroqSectorResult {
  id: string;
  analysis: string;
  catalyst: string;
  tradingAngle: string;
}

async function fetchAiAnalysis(
  sectors: Array<{
    id: string;
    shortName: string;
    avgChangePct: number;
    dataWindow: "2W" | "1D";
    newsCount: number;
    keyNews: string[];
    topMovers: SectorStock[];
  }>
): Promise<Map<string, GroqSectorResult>> {
  const fallback = new Map<string, GroqSectorResult>();
  if (!config.groqApiKey) return fallback;

  const sectorLines = sectors.map((s) => {
    const window = s.dataWindow === "2W" ? "2-week" : "intraday";
    const moversStr = s.topMovers
      .map((m) => `${m.name} ${m.changePct >= 0 ? "+" : ""}${m.changePct.toFixed(2)}%`)
      .join(", ");
    const newsLine = s.keyNews[0] || "no specific news";
    return (
      `${s.id} (${s.shortName}): ${window} avg change ${s.avgChangePct >= 0 ? "+" : ""}${s.avgChangePct.toFixed(2)}%, ` +
      `top movers [${moversStr}], key news: "${newsLine}"`
    );
  }).join("\n");

  const systemMsg =
    "You are a concise Indian equity market analyst. " +
    "Analyze sector momentum over the past 2 weeks and provide actionable insight. " +
    "Return ONLY valid JSON — no markdown, no commentary.";

  const userMsg =
    `Analyze these Indian market sectors based on their 2-week price performance and recent news:\n\n${sectorLines}\n\n` +
    `For each sector return a JSON array:\n` +
    `[\n` +
    `  {\n` +
    `    "id": "SECTOR_ID",\n` +
    `    "analysis": "2-sentence explanation of what drove this sector over the past 2 weeks",\n` +
    `    "catalyst": "key trigger in 8 words or less",\n` +
    `    "tradingAngle": "specific actionable trade idea in 12 words or less"\n` +
    `  }\n` +
    `]\n` +
    `Return exactly ${sectors.length} objects in the same order.`;

  try {
    const raw = await callGroq(systemMsg, userMsg);
    const parsed = extractJson(raw) as GroqSectorResult[];
    const map = new Map<string, GroqSectorResult>();
    for (const r of parsed) {
      if (r?.id) map.set(r.id, r);
    }
    return map;
  } catch {
    return fallback;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

let cache: { items: SectorAnalysis[]; at: number } = { items: [], at: 0 };
const CACHE_TTL = 15 * 60_000;

export async function computeHotSectors(): Promise<SectorAnalysis[]> {
  if (Date.now() - cache.at < CACHE_TTL && cache.items.length > 0) return cache.items;

  // 1. Fetch news (cached internally)
  const news = await getNews();

  // 2. Batch OHLC for today's prices and intraday changes (ltp + fallback change)
  const allSymbols = SECTOR_DEFS.flatMap((s) => s.stocks.map((st) => st.symbol));
  const ohlcMap: Record<string, { ltp: number; changePct: number }> = {};
  let anyPriceData = false;

  try {
    const ohlcRaw = await kiteService.getOHLC(allSymbols);
    for (const [sym, data] of Object.entries(ohlcRaw) as any) {
      const d = data as any;
      if (!d?.last_price) continue;
      const prevClose = d?.ohlc?.close ?? d.last_price;
      const changePct = prevClose ? ((d.last_price - prevClose) / prevClose) * 100 : 0;
      ohlcMap[sym] = { ltp: d.last_price, changePct };
      anyPriceData = true;
    }
  } catch {
    // Kite not authenticated — news-only mode
  }

  // 3. Fetch 2-week history for stocks with known tokens (parallel, failures silently skipped)
  const stocksWithTokens = SECTOR_DEFS
    .flatMap((s) => s.stocks.filter((st) => st.token))
    .map((st) => ({ symbol: st.symbol, token: st.token! }));

  const twoWeekMap: Record<string, number> = {};

  if (anyPriceData && stocksWithTokens.length > 0) {
    const results = await Promise.allSettled(
      stocksWithTokens.map((st) => fetch2WeekChange(st.token))
    );
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value !== null) {
        twoWeekMap[stocksWithTokens[i].symbol] = r.value;
      }
    });
  }

  // 4. Score each sector
  const scored = SECTOR_DEFS.map((def) => {
    const { score: newsScore, headlines: keyNews } = scoreSectorNews(def.keywords, news);

    // Per-stock: 2-week change if available, else today's OHLC
    const stocksWithData: SectorStock[] = def.stocks.map((st) => {
      const twoW   = twoWeekMap[st.symbol];
      const ohlc   = ohlcMap[st.symbol];
      const changePct = twoW ?? ohlc?.changePct ?? 0;
      return {
        symbol:    st.symbol.replace("NSE:", ""),
        name:      st.name,
        ltp:       ohlc?.ltp ?? 0,
        changePct: Math.round(changePct * 100) / 100,
      };
    });

    // Stocks with any price data for averaging
    const withChange = stocksWithData.filter(
      (s) => twoWeekMap[`NSE:${s.symbol}`] !== undefined || ohlcMap[`NSE:${s.symbol}`] !== undefined
    );

    const avgChangePct =
      withChange.length > 0
        ? withChange.reduce((sum, s) => sum + s.changePct, 0) / withChange.length
        : 0;

    // Determine if we used 2-week data for at least some stocks in this sector
    const has2W = def.stocks.some((st) => twoWeekMap[st.symbol] !== undefined);
    const dataWindow: "2W" | "1D" = has2W ? "2W" : "1D";

    // Top movers sorted by absolute 2-week (or OHLC) change
    const topMovers = [...stocksWithData]
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 4);

    const priceScore  = Math.abs(avgChangePct) * 0.6;
    const activityScore = Math.round((priceScore + newsScore * 0.4) * 10) / 10;

    const direction: "BULLISH" | "BEARISH" | "NEUTRAL" =
      avgChangePct > 0.5 ? "BULLISH" : avgChangePct < -0.5 ? "BEARISH" : "NEUTRAL";

    return {
      id: def.id,
      name: def.name,
      shortName: def.shortName,
      direction,
      avgChangePct: Math.round(avgChangePct * 100) / 100,
      activityScore,
      topMovers,
      newsCount: keyNews.length,
      keyNews,
      analysis: "",
      catalyst: "",
      tradingAngle: "",
      priceDataAvailable: anyPriceData,
      dataWindow,
    };
  });

  scored.sort((a, b) => b.activityScore - a.activityScore);

  // 5. AI analysis for top 5 sectors
  const topForAI = scored.slice(0, 5);
  const aiMap = await fetchAiAnalysis(topForAI);

  const result: SectorAnalysis[] = scored.map((s) => {
    const ai = aiMap.get(s.id);
    return {
      ...s,
      analysis:     ai?.analysis     ?? "Sector analysis unavailable — Groq API not configured.",
      catalyst:     ai?.catalyst     ?? "—",
      tradingAngle: ai?.tradingAngle ?? "—",
    };
  });

  cache = { items: result, at: Date.now() };
  return result;
}

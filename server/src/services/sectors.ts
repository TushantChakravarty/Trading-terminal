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
}

// ── Sector definitions ────────────────────────────────────────────────────────

interface StockDef { symbol: string; name: string }
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
      { symbol: "NSE:TCS",         name: "TCS"         },
      { symbol: "NSE:INFY",        name: "INFOSYS"     },
      { symbol: "NSE:WIPRO",       name: "WIPRO"       },
      { symbol: "NSE:HCLTECH",     name: "HCL TECH"    },
      { symbol: "NSE:TECHM",       name: "TECH M"      },
      { symbol: "NSE:LTIM",        name: "LTIMindtree" },
    ],
  },
  {
    id: "BANKING",
    name: "Banking & Finance",
    shortName: "BANKING",
    keywords: ["bank","banking","hdfc","icici","sbi","axis bank","kotak","nbfc","credit growth","loan","deposit","npa","bad loan","rbi","repo"],
    stocks: [
      { symbol: "NSE:HDFCBANK",    name: "HDFC BANK"   },
      { symbol: "NSE:ICICIBANK",   name: "ICICI BANK"  },
      { symbol: "NSE:SBIN",        name: "SBI"         },
      { symbol: "NSE:AXISBANK",    name: "AXIS BANK"   },
      { symbol: "NSE:KOTAKBANK",   name: "KOTAK BANK"  },
      { symbol: "NSE:INDUSINDBK",  name: "INDUSIND"    },
    ],
  },
  {
    id: "PHARMA",
    name: "Pharmaceuticals",
    shortName: "PHARMA",
    keywords: ["pharma","drug","medicine","usfda","fda","api","generic","cipla","sun pharma","dr reddy","biocon","hospital","healthcare","clinical"],
    stocks: [
      { symbol: "NSE:SUNPHARMA",  name: "SUN PHARMA"  },
      { symbol: "NSE:DRREDDY",    name: "DR REDDY"    },
      { symbol: "NSE:CIPLA",      name: "CIPLA"       },
      { symbol: "NSE:DIVISLAB",   name: "DIVIS LAB"   },
      { symbol: "NSE:APOLLOHOSP", name: "APOLLO HSP"  },
      { symbol: "NSE:LUPIN",      name: "LUPIN"       },
    ],
  },
  {
    id: "AUTO",
    name: "Automobiles & EV",
    shortName: "AUTO / EV",
    keywords: ["auto","automobile","car","vehicle","ev","electric vehicle","maruti","tata motors","mahindra","bajaj auto","hero motor","tvs","two-wheeler","passenger vehicle"],
    stocks: [
      { symbol: "NSE:MARUTI",      name: "MARUTI"      },
      { symbol: "NSE:TATAMOTORS",  name: "TATA MOTORS" },
      { symbol: "NSE:M&M",         name: "M&M"         },
      { symbol: "NSE:BAJAJ-AUTO",  name: "BAJAJ AUTO"  },
      { symbol: "NSE:EICHERMOT",   name: "EICHER"      },
      { symbol: "NSE:HEROMOTOCO",  name: "HERO MOTO"   },
    ],
  },
  {
    id: "ENERGY",
    name: "Energy & Oil & Gas",
    shortName: "ENERGY / OIL",
    keywords: ["oil","crude","brent","energy","reliance","ongc","bpcl","petroleum","gas","opec","refinery","ntpc","power","renewable","solar"],
    stocks: [
      { symbol: "NSE:RELIANCE",   name: "RELIANCE"    },
      { symbol: "NSE:ONGC",       name: "ONGC"        },
      { symbol: "NSE:BPCL",       name: "BPCL"        },
      { symbol: "NSE:NTPC",       name: "NTPC"        },
      { symbol: "NSE:POWERGRID",  name: "PWR GRID"    },
      { symbol: "NSE:GAIL",       name: "GAIL"        },
    ],
  },
  {
    id: "FMCG",
    name: "FMCG & Consumer",
    shortName: "FMCG",
    keywords: ["fmcg","consumer","hindustan unilever","hul","itc","nestle","britannia","dabur","marico","colgate","rural demand","consumption","volume growth"],
    stocks: [
      { symbol: "NSE:HINDUNILVR", name: "HUL"       },
      { symbol: "NSE:ITC",        name: "ITC"       },
      { symbol: "NSE:NESTLEIND",  name: "NESTLE"    },
      { symbol: "NSE:BRITANNIA",  name: "BRITANNIA" },
      { symbol: "NSE:DABUR",      name: "DABUR"     },
      { symbol: "NSE:MARICO",     name: "MARICO"    },
    ],
  },
  {
    id: "METAL",
    name: "Metals & Mining",
    shortName: "METALS",
    keywords: ["metal","steel","aluminium","aluminum","copper","zinc","tata steel","jsw steel","hindalco","coal india","vedanta","iron ore","commodities","lme","china demand"],
    stocks: [
      { symbol: "NSE:TATASTEEL",  name: "TATA STEEL"  },
      { symbol: "NSE:JSWSTEEL",   name: "JSW STEEL"   },
      { symbol: "NSE:HINDALCO",   name: "HINDALCO"    },
      { symbol: "NSE:COALINDIA",  name: "COAL INDIA"  },
      { symbol: "NSE:VEDL",       name: "VEDANTA"     },
      { symbol: "NSE:NMDC",       name: "NMDC"        },
    ],
  },
  {
    id: "REALTY",
    name: "Real Estate",
    shortName: "REALTY",
    keywords: ["realty","real estate","property","housing","dlf","godrej properties","lodha","prestige","home loan","residential","commercial","registration"],
    stocks: [
      { symbol: "NSE:DLF",         name: "DLF"         },
      { symbol: "NSE:GODREJPROP",  name: "GODREJ PROP" },
      { symbol: "NSE:LODHA",       name: "LODHA"       },
      { symbol: "NSE:PRESTIGE",    name: "PRESTIGE"    },
      { symbol: "NSE:OBEROIRLTY",  name: "OBEROI"      },
    ],
  },
  {
    id: "DEFENCE",
    name: "Defence & Aerospace",
    shortName: "DEFENCE",
    keywords: ["defence","defense","military","aerospace","hal","bel","bharat forge","beml","defence order","indigenization","export","weapon"],
    stocks: [
      { symbol: "NSE:HAL",         name: "HAL"          },
      { symbol: "NSE:BEL",         name: "BEL"          },
      { symbol: "NSE:BHARATFORG",  name: "BHARAT FORGE" },
      { symbol: "NSE:BEML",        name: "BEML"         },
      { symbol: "NSE:COCHINSHIP",  name: "COCHIN SHIP"  },
    ],
  },
];

// ── Groq helper (same pattern as ai.ts) ──────────────────────────────────────

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
  // Best-effort repair
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
    newsCount: number;
    keyNews: string[];
    topMovers: SectorStock[];
  }>
): Promise<Map<string, GroqSectorResult>> {
  const fallback = new Map<string, GroqSectorResult>();
  if (!config.groqApiKey) return fallback;

  const sectorLines = sectors
    .map((s) => {
      const moversStr = s.topMovers.map((m) => `${m.name} ${m.changePct >= 0 ? "+" : ""}${m.changePct.toFixed(2)}%`).join(", ");
      const newsLine = s.keyNews[0] || "no specific news";
      return `${s.id} (${s.shortName}): avg change ${s.avgChangePct >= 0 ? "+" : ""}${s.avgChangePct.toFixed(2)}%, top movers [${moversStr}], key news: "${newsLine}"`;
    })
    .join("\n");

  const systemMsg =
    "You are a concise Indian equity market analyst. " +
    "Analyze sector momentum and provide actionable insight. " +
    "Return ONLY valid JSON — no markdown, no commentary.";

  const userMsg =
    `Analyze these Indian market sectors based on today's price action and news:\n\n${sectorLines}\n\n` +
    `For each sector return a JSON array:\n` +
    `[\n` +
    `  {\n` +
    `    "id": "SECTOR_ID",\n` +
    `    "analysis": "2-sentence explanation of what is driving this sector today",\n` +
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
const CACHE_TTL = 15 * 60_000; // 15 min

export async function computeHotSectors(): Promise<SectorAnalysis[]> {
  if (Date.now() - cache.at < CACHE_TTL && cache.items.length > 0) return cache.items;

  // 1. Fetch news (cached internally)
  const news = await getNews();

  // 2. Batch OHLC for all sector stocks
  const allSymbols = SECTOR_DEFS.flatMap((s) => s.stocks.map((st) => st.symbol));
  let ohlcMap: Record<string, { ltp: number; changePct: number }> = {};
  let priceDataAvailable = false;

  try {
    const ohlcRaw = await kiteService.getOHLC(allSymbols);
    for (const [sym, data] of Object.entries(ohlcRaw) as any) {
      const d = data as any;
      if (!d?.last_price || !d?.ohlc?.close) continue;
      const changePct = ((d.last_price - d.ohlc.close) / d.ohlc.close) * 100;
      ohlcMap[sym] = { ltp: d.last_price, changePct };
    }
    priceDataAvailable = Object.keys(ohlcMap).length > 0;
  } catch {
    // Kite not authenticated or API error — news-only mode
  }

  // 3. Score each sector
  const scored = SECTOR_DEFS.map((def) => {
    const { score: newsScore, headlines: keyNews } = scoreSectorNews(def.keywords, news);

    const stocksWithData: SectorStock[] = def.stocks
      .map((st) => {
        const q = ohlcMap[st.symbol];
        return {
          symbol: st.symbol.replace("NSE:", ""),
          name: st.name,
          ltp: q?.ltp ?? 0,
          changePct: q?.changePct ?? 0,
        };
      })
      .filter((s) => s.ltp > 0 || !priceDataAvailable);

    const withPrice = stocksWithData.filter((s) => s.ltp > 0);
    const avgChangePct =
      withPrice.length > 0
        ? withPrice.reduce((sum, s) => sum + s.changePct, 0) / withPrice.length
        : 0;

    // Sort by absolute change for top movers
    const topMovers = [...stocksWithData]
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 4);

    const priceScore = Math.abs(avgChangePct) * 0.6;
    const activityScore = Math.round((priceScore + newsScore * 0.4) * 10) / 10;

    const direction: "BULLISH" | "BEARISH" | "NEUTRAL" =
      avgChangePct > 0.3 ? "BULLISH" : avgChangePct < -0.3 ? "BEARISH" : "NEUTRAL";

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
      priceDataAvailable,
    };
  });

  // Sort by activityScore descending
  scored.sort((a, b) => b.activityScore - a.activityScore);

  // 4. AI analysis for top 5 most active sectors
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

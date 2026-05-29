import { kiteService } from "./kite";
import { getNews } from "./news";
import { config } from "../config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ThemeStock {
  symbol: string;
  name: string;
  return1M: number;
  ltp: number;
}

export type ThemeMomentum = "STRONG" | "MODERATE" | "WEAK" | "NEGATIVE";

export interface ThemeAnalysis {
  id: string;
  name: string;
  shortName: string;
  avgReturn1M: number;
  breadth: number;            // 0–1: fraction of stocks with positive 1M return
  stockCount: number;         // stocks with resolved price data
  topPerformers: ThemeStock[];
  newsCount: number;
  keyNews: string[];
  driver: string;
  analysis: string;
  tradingAngle: string;
  momentum: ThemeMomentum;
}

// ── Theme definitions ─────────────────────────────────────────────────────────
// Symbols are NSE tradingsymbols. Tokens are resolved dynamically via
// getInstruments("NSE"), so no hardcoding required. Unknown symbols silently
// produce no data and are excluded from averages.

interface StockDef { symbol: string; name: string }
interface ThemeDef {
  id: string;
  name: string;
  shortName: string;
  keywords: string[];
  stocks: StockDef[];
}

const THEME_DEFS: ThemeDef[] = [
  {
    id: "OPTICAL_FIBRE",
    name: "Optical Fibre & Telecom Infrastructure",
    shortName: "OPTICAL FIBRE",
    keywords: ["optical fibre","bharatnet","5g","telecom infrastructure","hfcl","sterlite","fibre cable","telecom rollout","bsnl upgrade"],
    stocks: [
      { symbol: "STLTECH",     name: "STERLITE TECH" },
      { symbol: "HFCL",        name: "HFCL"          },
      { symbol: "VINDHYATELE", name: "VINDHYA TEL"   },
      { symbol: "TEJAS",       name: "TEJAS NETWORKS" },
      { symbol: "VIMTA",       name: "VIMTA LABS"    },
    ],
  },
  {
    id: "DEFENCE_ELECTRONICS",
    name: "Defence Electronics & Systems",
    shortName: "DEFENCE ELEC",
    keywords: ["defence electronics","radar","electronic warfare","defence order","indigenization","bel","paras defence","data patterns","zen tech","mtar"],
    stocks: [
      { symbol: "BEL",         name: "BEL"            },
      { symbol: "MTAR",        name: "MTAR TECH"      },
      { symbol: "DATAPATTNS",  name: "DATA PATTERNS"  },
      { symbol: "ZENTEC",      name: "ZEN TECH"       },
      { symbol: "PARASDEFENC", name: "PARAS DEFENCE"  },
    ],
  },
  {
    id: "RAILWAYS",
    name: "Railways & Rail Infrastructure",
    shortName: "RAILWAYS",
    keywords: ["railway","rail","rvnl","irfc","ircon","vande bharat","freight corridor","rail vikas","texmaco","jupiter wagon","railtel"],
    stocks: [
      { symbol: "RVNL",        name: "RVNL"           },
      { symbol: "IRFC",        name: "IRFC"           },
      { symbol: "IRCON",       name: "IRCON"          },
      { symbol: "JUPITERWAG",  name: "JUPITER WAG"    },
      { symbol: "TEXRAIL",     name: "TEXMACO RAIL"   },
      { symbol: "RAILTEL",     name: "RAILTEL"        },
    ],
  },
  {
    id: "SOLAR_RENEWABLE",
    name: "Solar & Renewable Energy",
    shortName: "SOLAR / RENEW",
    keywords: ["solar","renewable","green energy","wind","waaree","premier energy","adani green","tata power","clean energy","pli solar","rooftop solar"],
    stocks: [
      { symbol: "TATAPOWER",   name: "TATA POWER"     },
      { symbol: "ADANIGREEN",  name: "ADANI GREEN"    },
      { symbol: "WAAREEENER",  name: "WAAREE"         },
      { symbol: "PREMIERENE",  name: "PREMIER ENER"   },
      { symbol: "BOROSLRENE",  name: "BOROSIL REN"    },
      { symbol: "WEBSOL",      name: "WEBSOL ENERGY"  },
    ],
  },
  {
    id: "EMS",
    name: "Electronics Manufacturing Services (EMS)",
    shortName: "EMS / ELECTRONICS",
    keywords: ["ems","electronics manufacturing","dixon","kaynes","amber","syrma","pli electronics","apple supply","samsung supply","contract manufacturing"],
    stocks: [
      { symbol: "DIXON",       name: "DIXON TECH"     },
      { symbol: "KAYNES",      name: "KAYNES TECH"    },
      { symbol: "AMBER",       name: "AMBER ENT"      },
      { symbol: "SYRMA",       name: "SYRMA SGS"      },
      { symbol: "PGEL",        name: "PG ELECTROPLAST"},
    ],
  },
  {
    id: "SPECIALTY_CHEM",
    name: "Specialty Chemicals",
    shortName: "SPECIALTY CHEM",
    keywords: ["specialty chemicals","pi industries","srf","navin fluorine","deepak nitrite","agrochem","fluorochemicals","laurus","china plus one"],
    stocks: [
      { symbol: "PIIND",       name: "PI INDS"        },
      { symbol: "SRF",         name: "SRF"            },
      { symbol: "NAVINFLUOR",  name: "NAVIN FLUOR"    },
      { symbol: "DEEPAKNTR",   name: "DEEPAK NITRITE" },
      { symbol: "LAURUS",      name: "LAURUS LABS"    },
      { symbol: "GALAXYSURF",  name: "GALAXY SURFAC"  },
    ],
  },
  {
    id: "CAPITAL_MARKETS",
    name: "Capital Markets & Wealth Management",
    shortName: "CAPITAL MKTS",
    keywords: ["amс","mutual fund","sip","wealth management","angel one","bse","cdsl","kfintech","depository","asset management","folio"],
    stocks: [
      { symbol: "ANGELONE",    name: "ANGEL ONE"      },
      { symbol: "BSE",         name: "BSE"            },
      { symbol: "CDSL",        name: "CDSL"           },
      { symbol: "HDFCAMC",     name: "HDFC AMC"       },
      { symbol: "CAMS",        name: "CAMS"           },
      { symbol: "KFINTECH",    name: "KFINTECH"       },
    ],
  },
  {
    id: "DATA_CENTER",
    name: "Data Centers & IT Infrastructure",
    shortName: "DATA CENTERS",
    keywords: ["data center","cloud","hyperscaler","netweb","ai infrastructure","server","rack","colocation","stpi"],
    stocks: [
      { symbol: "NETWEB",      name: "NETWEB TECH"    },
      { symbol: "ZENSAR",      name: "ZENSAR TECH"    },
      { symbol: "REDINGTON",   name: "REDINGTON"      },
      { symbol: "RATEGAIN",    name: "RATEGAIN"       },
    ],
  },
  {
    id: "PSU_CAPEX",
    name: "PSU Capital Expenditure & Infra",
    shortName: "PSU CAPEX",
    keywords: ["infrastructure","capex","l&t","bhel","siemens","abb","thermax","psu capex","government spending","public sector","power equipment"],
    stocks: [
      { symbol: "LT",          name: "L&T"            },
      { symbol: "BHEL",        name: "BHEL"           },
      { symbol: "SIEMENS",     name: "SIEMENS"        },
      { symbol: "ABB",         name: "ABB"            },
      { symbol: "THERMAX",     name: "THERMAX"        },
      { symbol: "KALPATPOWR",  name: "KALPATARU"      },
    ],
  },
  {
    id: "EV_BATTERY",
    name: "EV & Battery Storage",
    shortName: "EV / BATTERY",
    keywords: ["ev","electric vehicle","battery","lithium","amara raja","exide","greenwing","energy storage","bms","charging infrastructure","zwei"],
    stocks: [
      { symbol: "AMARAJABAT",  name: "AMARA RAJA"     },
      { symbol: "EXIDEIND",    name: "EXIDE"          },
      { symbol: "OLECTRA",     name: "OLECTRA"        },
      { symbol: "GREENPANEL",  name: "GREENPANEL"     },
    ],
  },
  {
    id: "HOSPITALS",
    name: "Hospitals & Healthcare Services",
    shortName: "HOSPITALS",
    keywords: ["hospital","healthcare","apollo","max healthcare","aster","fortis","narayan","bed capacity","medical tourism"],
    stocks: [
      { symbol: "APOLLOHOSP",  name: "APOLLO HSP"     },
      { symbol: "MAXHEALTH",   name: "MAX HEALTH"     },
      { symbol: "ASTERDM",     name: "ASTER DM"       },
      { symbol: "FORTIS",      name: "FORTIS"         },
      { symbol: "NH",          name: "NARAYANA HLTH"  },
    ],
  },
  {
    id: "AGRO_CHEM",
    name: "Agri & Agrochemicals",
    shortName: "AGRI / AGROCHEMICALS",
    keywords: ["agrochemical","pesticide","fertilizer","upl","pi industries","dhanuka","kharif","rabi","monsoon","crop protection"],
    stocks: [
      { symbol: "UPL",         name: "UPL"            },
      { symbol: "DHANUKA",     name: "DHANUKA"        },
      { symbol: "RALLIS",      name: "RALLIS"         },
      { symbol: "BAYER",       name: "BAYER CROPSC"   },
      { symbol: "SUMICHEM",    name: "SUMITOMO CHEM"  },
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
      max_tokens: 1400,
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
  if (start === -1) throw new Error("No JSON array");
  const end = stripped.lastIndexOf("]");
  if (end > start) {
    try { return JSON.parse(stripped.slice(start, end + 1)); } catch { /* repair */ }
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

// ── Token resolution via instruments list ─────────────────────────────────────

let symbolTokenCache: { map: Map<string, number>; at: number } | null = null;

async function resolveTokens(symbols: string[]): Promise<Map<string, number>> {
  // Use or refresh the cached symbol→token map (1 hour TTL)
  if (!symbolTokenCache || Date.now() - symbolTokenCache.at > 60 * 60_000) {
    const instruments: any[] = await kiteService.getInstruments("NSE");
    const map = new Map<string, number>();
    for (const inst of instruments) {
      if (inst.tradingsymbol && inst.instrument_token) {
        map.set(inst.tradingsymbol as string, inst.instrument_token as number);
      }
    }
    symbolTokenCache = { map, at: Date.now() };
  }

  const result = new Map<string, number>();
  for (const sym of symbols) {
    const tok = symbolTokenCache.map.get(sym);
    if (tok) result.set(sym, tok);
  }
  return result;
}

// ── 1-month historical return ─────────────────────────────────────────────────

async function fetch1MData(token: number): Promise<{ return1M: number; ltp: number } | null> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 35); // ~35 cal days → ~24 trading days

  try {
    const candles: any[] = await kiteService.getHistoricalData(token, "day", from, to);
    if (!candles || candles.length < 5) return null;
    const first = candles[0].close;
    const last  = candles[candles.length - 1].close;
    if (!first) return null;
    return {
      return1M: ((last - first) / first) * 100,
      ltp: last,
    };
  } catch {
    return null;
  }
}

// ── News scoring ──────────────────────────────────────────────────────────────

function scoreThemeNews(
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

// ── AI analysis ───────────────────────────────────────────────────────────────

interface GroqThemeResult {
  id: string;
  driver: string;
  analysis: string;
  tradingAngle: string;
}

async function fetchAiAnalysis(
  themes: Array<{
    id: string;
    shortName: string;
    avgReturn1M: number;
    breadth: number;
    topPerformers: ThemeStock[];
    keyNews: string[];
  }>
): Promise<Map<string, GroqThemeResult>> {
  const fallback = new Map<string, GroqThemeResult>();
  if (!config.groqApiKey || themes.length === 0) return fallback;

  const lines = themes.map((t) => {
    const perfs = t.topPerformers
      .map((s) => `${s.name} ${s.return1M >= 0 ? "+" : ""}${s.return1M.toFixed(1)}%`)
      .join(", ");
    const news = t.keyNews[0] || "no news";
    return (
      `${t.id} (${t.shortName}): avg 1-month return ${t.avgReturn1M >= 0 ? "+" : ""}${t.avgReturn1M.toFixed(1)}%, ` +
      `breadth ${Math.round(t.breadth * 100)}% stocks positive, ` +
      `top performers [${perfs}], key news: "${news}"`
    );
  }).join("\n");

  const systemMsg =
    "You are a sharp Indian equity market analyst specializing in thematic investing. " +
    "Identify the macro or policy driver behind each theme's price action. " +
    "Return ONLY valid JSON — no markdown, no commentary.";

  const userMsg =
    `Analyze these Indian market themes based on 1-month price performance:\n\n${lines}\n\n` +
    `Return a JSON array — one object per theme:\n` +
    `[\n` +
    `  {\n` +
    `    "id": "THEME_ID",\n` +
    `    "driver": "core macro/policy driver in 10 words or less",\n` +
    `    "analysis": "2-sentence explanation of why this theme is moving",\n` +
    `    "tradingAngle": "specific stock or derivative idea in 12 words or less"\n` +
    `  }\n` +
    `]\n` +
    `Return exactly ${themes.length} objects in the same order.`;

  try {
    const raw = await callGroq(systemMsg, userMsg);
    const parsed = extractJson(raw) as GroqThemeResult[];
    const map = new Map<string, GroqThemeResult>();
    for (const r of parsed) {
      if (r?.id) map.set(r.id, r);
    }
    return map;
  } catch {
    return fallback;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

let cache: { items: ThemeAnalysis[]; at: number } = { items: [], at: 0 };
const CACHE_TTL = 30 * 60_000; // 30 min — 1-month data doesn't change fast

export async function computeThemes(): Promise<ThemeAnalysis[]> {
  if (Date.now() - cache.at < CACHE_TTL && cache.items.length > 0) return cache.items;

  const news = await getNews();

  // Resolve all unique symbols to Zerodha tokens via instruments list
  const allSymbols = [...new Set(THEME_DEFS.flatMap((t) => t.stocks.map((s) => s.symbol)))];
  const tokenMap = await resolveTokens(allSymbols);

  // Fetch 1-month data for all resolved tokens in parallel
  const resolvedSymbols = [...tokenMap.keys()];
  const dataResults = await Promise.allSettled(
    resolvedSymbols.map((sym) => fetch1MData(tokenMap.get(sym)!))
  );

  const priceData = new Map<string, { return1M: number; ltp: number }>();
  dataResults.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value !== null) {
      priceData.set(resolvedSymbols[i], r.value);
    }
  });

  const priceDataAvailable = priceData.size > 0;

  // Score each theme
  const scored = THEME_DEFS.map((def) => {
    const { score: newsScore, headlines: keyNews } = scoreThemeNews(def.keywords, news);

    const stocksWithData: ThemeStock[] = def.stocks
      .map((st) => {
        const d = priceData.get(st.symbol);
        return {
          symbol:   st.symbol,
          name:     st.name,
          return1M: d ? Math.round(d.return1M * 100) / 100 : 0,
          ltp:      d?.ltp ?? 0,
        };
      })
      .filter((s) => s.ltp > 0);

    const stockCount  = stocksWithData.length;
    const positiveCount = stocksWithData.filter((s) => s.return1M > 0).length;
    const breadth     = stockCount > 0 ? positiveCount / stockCount : 0;
    const avgReturn1M = stockCount > 0
      ? stocksWithData.reduce((sum, s) => sum + s.return1M, 0) / stockCount
      : 0;

    const topPerformers = [...stocksWithData]
      .sort((a, b) => b.return1M - a.return1M)
      .slice(0, 5);

    const momentum: ThemeMomentum =
      avgReturn1M > 10 && breadth >= 0.7 ? "STRONG"   :
      avgReturn1M > 4  && breadth >= 0.5 ? "MODERATE" :
      avgReturn1M > 0  || breadth >= 0.5 ? "WEAK"     :
                                           "NEGATIVE";

    // Activity score: combines price momentum, breadth, and news
    const priceScore  = priceDataAvailable ? Math.abs(avgReturn1M) * 0.5 + breadth * 10 : 0;
    const activityScore = priceScore + newsScore * 0.3;

    return {
      id: def.id,
      name: def.name,
      shortName: def.shortName,
      avgReturn1M: Math.round(avgReturn1M * 100) / 100,
      breadth,
      stockCount,
      topPerformers,
      newsCount: keyNews.length,
      keyNews,
      driver: "",
      analysis: "",
      tradingAngle: "",
      momentum,
      _activityScore: activityScore,
    };
  });

  // Sort: STRONG > MODERATE > WEAK > NEGATIVE, then by activityScore
  const momentumOrder: Record<ThemeMomentum, number> = {
    STRONG: 4, MODERATE: 3, WEAK: 2, NEGATIVE: 1,
  };
  scored.sort((a, b) => {
    const md = momentumOrder[b.momentum] - momentumOrder[a.momentum];
    return md !== 0 ? md : b._activityScore - a._activityScore;
  });

  // AI analysis for top 5 themes with price data
  const topForAI = scored
    .filter((s) => s.stockCount > 0 || s.newsCount > 0)
    .slice(0, 5);
  const aiMap = await fetchAiAnalysis(topForAI);

  const result: ThemeAnalysis[] = scored.map((s) => {
    const { _activityScore: _, ...rest } = s;
    const ai = aiMap.get(s.id);
    return {
      ...rest,
      driver:       ai?.driver       ?? "—",
      analysis:     ai?.analysis     ?? "Theme analysis unavailable.",
      tradingAngle: ai?.tradingAngle ?? "—",
    };
  });

  cache = { items: result, at: Date.now() };
  return result;
}

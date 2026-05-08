import Parser from "rss-parser";

export type NewsCategory =
  | "RBI"
  | "MACRO"
  | "GLOBAL"
  | "CORPORATE"
  | "MARKETS"
  | "BUDGET"
  | "SECTOR"
  | "GENERAL";

export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
  category: NewsCategory;
  impact: ImpactLevel;
}

const parser = new Parser({ timeout: 8000 });

const FEEDS = [
  { url: "https://economictimes.indiatimes.com/markets/rss.cms", source: "ET Markets" },
  { url: "https://economictimes.indiatimes.com/economy/rss.cms", source: "ET Economy" },
  { url: "https://www.moneycontrol.com/rss/latestnews.xml", source: "Moneycontrol" },
  { url: "https://www.livemint.com/rss/markets", source: "LiveMint" },
  { url: "https://www.livemint.com/rss/economy", source: "LiveMint Economy" },
  { url: "https://www.business-standard.com/rss/markets-106.rss", source: "Business Standard" },
  { url: "https://www.business-standard.com/rss/economy-policy-102.rss", source: "BS Economy" },
  { url: "https://www.financialexpress.com/market/feed/", source: "Financial Express" },
  { url: "https://www.cnbctv18.com/commonfeeds/v1/eng/rss/market.xml", source: "CNBC TV18" },
  { url: "https://feeds.reuters.com/reuters/INbusinessNews", source: "Reuters India" },
];

// Keyword → category mapping (checked against lowercased title)
const CATEGORY_RULES: [NewsCategory, string[]][] = [
  [
    "RBI",
    [
      "rbi", "reserve bank", "repo rate", "monetary policy", "crr", "slr",
      "mpc", "shaktikanta", "governor", "liquidity", "open market",
    ],
  ],
  [
    "MACRO",
    [
      "gdp", "cpi", "wpi", "inflation", "iip", "pmi", "current account",
      "trade deficit", "forex reserve", "rupee", "fiscal deficit", "rbi data",
    ],
  ],
  [
    "GLOBAL",
    [
      "us fed", "federal reserve", "powell", "crude oil", "brent", "opec",
      "china", "us market", "dow jones", "nasdaq", "fii", "fpi",
      "foreign investor", "dollar index", "dxy", "us gdp", "global market",
    ],
  ],
  [
    "BUDGET",
    [
      "budget", "union budget", "gst", "income tax", "finance minister",
      "nirmala", "fiscal", "ministry of finance", "direct tax", "indirect tax",
      "custom duty",
    ],
  ],
  [
    "CORPORATE",
    [
      " results", "earnings", "quarterly", "q1 ", "q2 ", "q3 ", "q4 ",
      "net profit", "revenue", "ebitda", "ipo", "ncd", "merger",
      "acquisition", "board meeting", "dividend", "buyback", "demerger",
    ],
  ],
  [
    "SECTOR",
    [
      "banking sector", "pharma", "it sector", "auto sector", "fmcg",
      "metal", "realty", "nbfc", "insurance", "telecom", "aviation",
      "oil and gas", "power sector", "infra",
    ],
  ],
  [
    "MARKETS",
    [
      "nifty", "sensex", "banknifty", "circuit breaker", "upper circuit",
      "lower circuit", "bull run", "correction", "rally", "sell-off",
      "f&o", "options expiry", "derivatives",
    ],
  ],
];

// High-impact keyword patterns
const HIGH_IMPACT_KEYWORDS = [
  "rate cut", "rate hike", "repo rate", "federal reserve decision",
  "budget 2", "rbi policy", "circuit breaker", "crash", "black",
  "election result", "gdp growth", "emergency", "war", "sanction",
  "sebi ban", "fraud", "scam", "default",
];

const MEDIUM_IMPACT_KEYWORDS = [
  "earnings", "results", "profit", "fii", "fpi", "crude oil",
  "cpi data", "wpi data", "rupee", "iip data", "pmi data",
  "trade data", "forex", "current account", "ipo open",
];

function categorize(title: string, snippet: string): NewsCategory {
  const text = (title + " " + snippet).toLowerCase();
  for (const [cat, keywords] of CATEGORY_RULES) {
    if (keywords.some((kw) => text.includes(kw))) return cat;
  }
  return "GENERAL";
}

function scoreImpact(title: string, snippet: string): ImpactLevel {
  const text = (title + " " + snippet).toLowerCase();
  if (HIGH_IMPACT_KEYWORDS.some((kw) => text.includes(kw))) return "HIGH";
  if (MEDIUM_IMPACT_KEYWORDS.some((kw) => text.includes(kw))) return "MEDIUM";
  return "LOW";
}

async function fetchFeed(feed: { url: string; source: string }): Promise<NewsItem[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items || []).slice(0, 20).map((item) => {
      const title = item.title || "";
      const snippet = item.contentSnippet?.slice(0, 300) || "";
      return {
        title,
        link: item.link || "",
        source: feed.source,
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        snippet,
        category: categorize(title, snippet),
        impact: scoreImpact(title, snippet),
      };
    });
  } catch {
    return [];
  }
}

let cache: { items: NewsItem[]; at: number } = { items: [], at: 0 };
const CACHE_TTL = 5 * 60 * 1000;

export async function getNews(): Promise<NewsItem[]> {
  if (Date.now() - cache.at < CACHE_TTL && cache.items.length > 0) {
    return cache.items;
  }

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const items = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 100);

  cache = { items, at: Date.now() };
  return items;
}

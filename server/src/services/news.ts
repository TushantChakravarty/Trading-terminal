import Parser from "rss-parser";
import { config } from "../config";

export type NewsCategory =
  | "RBI"
  | "MACRO"
  | "GLOBAL"
  | "CORPORATE"
  | "MARKETS"
  | "BUDGET"
  | "SECTOR"
  | "WAR"
  | "OIL"
  | "HEALTH"
  | "GENERAL";

export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";

export interface NewsItem {
  title:    string;
  link:     string;
  source:   string;
  pubDate:  string;
  snippet:  string;
  category: NewsCategory;
  impact:   ImpactLevel;
}

// ── RSS feeds ─────────────────────────────────────────────────────────────────

const parser = new Parser({ timeout: 8000 });

const FEEDS = [
  { url: "https://economictimes.indiatimes.com/markets/rss.cms",          source: "ET Markets"        },
  { url: "https://economictimes.indiatimes.com/economy/rss.cms",           source: "ET Economy"        },
  { url: "https://www.moneycontrol.com/rss/latestnews.xml",                source: "Moneycontrol"      },
  { url: "https://www.livemint.com/rss/markets",                           source: "LiveMint"          },
  { url: "https://www.livemint.com/rss/economy",                           source: "LiveMint Economy"  },
  { url: "https://www.business-standard.com/rss/markets-106.rss",          source: "Business Standard" },
  { url: "https://www.business-standard.com/rss/economy-policy-102.rss",   source: "BS Economy"        },
  { url: "https://www.financialexpress.com/market/feed/",                  source: "Financial Express" },
  { url: "https://www.cnbctv18.com/commonfeeds/v1/eng/rss/market.xml",     source: "CNBC TV18"         },
  { url: "https://feeds.reuters.com/reuters/INbusinessNews",               source: "Reuters India"     },
];

// ── Category rules ────────────────────────────────────────────────────────────

const CATEGORY_RULES: [NewsCategory, string[]][] = [
  ["RBI", [
    "rbi", "reserve bank", "repo rate", "monetary policy", "crr", "slr",
    "mpc", "shaktikanta", "governor", "liquidity", "open market",
  ]],
  ["WAR", [
    "war", "conflict", "military", "sanctions", "geopolitical", "invasion",
    "ceasefire", "nato", "missile", "airstrike", "coup", "troops", "artillery",
    "nuclear", "offensive", "frontline", "bombardment", "drone strike",
    "israel", "ukraine", "russia", "hamas", "hezbollah", "taiwan strait",
  ]],
  ["OIL", [
    "crude oil", "crude price", "brent", "wti", "opec", "oil price",
    "natural gas", "energy price", "petroleum", "barrel", "oil supply",
    "oil demand", "oil cut", "opec+", "shale", "oil inventory",
  ]],
  ["HEALTH", [
    "virus", "pandemic", "outbreak", "epidemic", "variant", "lockdown",
    "vaccine", "health emergency", "who declared", "mpox", "covid",
    "disease", "contagion", "quarantine", "pathogen",
  ]],
  ["MACRO", [
    "gdp", "cpi", "wpi", "inflation", "iip", "pmi", "current account",
    "trade deficit", "forex reserve", "rupee", "fiscal deficit", "rbi data",
  ]],
  ["GLOBAL", [
    "us fed", "federal reserve", "powell", "ecb", "bank of japan",
    "china", "us market", "dow jones", "nasdaq", "fii", "fpi",
    "foreign investor", "dollar index", "dxy", "us gdp", "global market",
    "trade war", "tariff", "recession", "imf", "world bank",
  ]],
  ["BUDGET", [
    "budget", "union budget", "gst", "income tax", "finance minister",
    "nirmala", "fiscal", "ministry of finance", "direct tax", "indirect tax",
    "custom duty",
  ]],
  ["CORPORATE", [
    " results", "earnings", "quarterly", "q1 ", "q2 ", "q3 ", "q4 ",
    "net profit", "revenue", "ebitda", "ipo", "ncd", "merger",
    "acquisition", "board meeting", "dividend", "buyback", "demerger",
  ]],
  ["SECTOR", [
    "banking sector", "pharma", "it sector", "auto sector", "fmcg",
    "metal", "realty", "nbfc", "insurance", "telecom", "aviation",
    "oil and gas", "power sector", "infra",
  ]],
  ["MARKETS", [
    "nifty", "sensex", "banknifty", "circuit breaker", "upper circuit",
    "lower circuit", "bull run", "correction", "rally", "sell-off",
    "f&o", "options expiry", "derivatives",
  ]],
];

const HIGH_IMPACT_KEYWORDS = [
  "rate cut", "rate hike", "repo rate", "federal reserve decision",
  "budget 2", "rbi policy", "circuit breaker", "crash", "black swan",
  "election result", "gdp growth", "emergency", "war declared", "ceasefire",
  "sanctions imposed", "oil embargo", "pandemic declared", "outbreak",
  "sebi ban", "fraud", "scam", "default", "nuclear", "coup",
  "oil price surge", "oil price crash", "rate decision",
];

const MEDIUM_IMPACT_KEYWORDS = [
  "earnings", "results", "profit", "fii", "fpi", "crude oil",
  "cpi data", "wpi data", "rupee", "iip data", "pmi data",
  "trade data", "forex", "current account", "ipo open",
  "opec meeting", "fed minutes", "inflation data", "employment data",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── RSS fetch ─────────────────────────────────────────────────────────────────

async function fetchFeed(feed: { url: string; source: string }): Promise<NewsItem[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items || []).slice(0, 20).map((item) => {
      const title   = item.title || "";
      const snippet = item.contentSnippet?.slice(0, 300) || "";
      return {
        title,
        link:     item.link || "",
        source:   feed.source,
        pubDate:  item.pubDate || item.isoDate || new Date().toISOString(),
        snippet,
        category: categorize(title, snippet),
        impact:   scoreImpact(title, snippet),
      };
    });
  } catch {
    return [];
  }
}

// ── NewsAPI fetch ─────────────────────────────────────────────────────────────
// Uses a single broad query covering war, oil, health, and global policy.
// Cache TTL is 15 min to stay within the 100 req/day free tier.

const NEWSAPI_QUERY = [
  // Geopolitical / war
  "war", "sanctions", "military conflict", "ceasefire", "invasion",
  // Oil / energy
  "crude oil", "OPEC", "brent", "oil price", "natural gas",
  // Health / virus
  "pandemic", "virus outbreak", "WHO emergency",
  // Macro / policy
  "federal reserve", "interest rate decision", "ECB rate", "central bank",
  "recession", "trade war", "tariff",
].join(" OR ");

let newsApiCache: { items: NewsItem[]; at: number } = { items: [], at: 0 };
const NEWSAPI_TTL = 15 * 60_000; // 15 min — ~64 req/day within free tier

async function fetchNewsAPI(): Promise<NewsItem[]> {
  if (!config.newsApiKey) return [];

  if (Date.now() - newsApiCache.at < NEWSAPI_TTL && newsApiCache.items.length > 0) {
    return newsApiCache.items;
  }

  try {
    const url =
      `https://newsapi.org/v2/everything` +
      `?q=${encodeURIComponent(NEWSAPI_QUERY)}` +
      `&language=en` +
      `&pageSize=40` +
      `&sortBy=publishedAt` +
      `&apiKey=${config.newsApiKey}`;

    const resp = await fetch(url, {
      headers: { "User-Agent": "TradingTerminal/1.0" },
    });

    if (!resp.ok) throw new Error(`NewsAPI HTTP ${resp.status}`);

    const json = await resp.json() as any;
    const articles: any[] = json.articles ?? [];

    const items: NewsItem[] = articles
      .filter((a) => a.title && a.title !== "[Removed]")
      .map((a) => {
        const title   = a.title || "";
        const snippet = a.description?.slice(0, 300) || "";
        return {
          title,
          link:     a.url || "",
          source:   a.source?.name || "NewsAPI",
          pubDate:  a.publishedAt || new Date().toISOString(),
          snippet,
          category: categorize(title, snippet),
          impact:   scoreImpact(title, snippet),
        };
      });

    newsApiCache = { items, at: Date.now() };
    return items;
  } catch (err: any) {
    console.error("[news] NewsAPI fetch failed:", err.message);
    return newsApiCache.items; // return stale on error
  }
}

// ── Combined feed ─────────────────────────────────────────────────────────────

let cache: { items: NewsItem[]; at: number } = { items: [], at: 0 };
const CACHE_TTL = 5 * 60_000;

export async function getNews(): Promise<NewsItem[]> {
  if (Date.now() - cache.at < CACHE_TTL && cache.items.length > 0) {
    return cache.items;
  }

  const [rssResults, newsApiItems] = await Promise.all([
    Promise.allSettled(FEEDS.map(fetchFeed)),
    fetchNewsAPI(),
  ]);

  const rssItems = rssResults.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  // Deduplicate by title prefix (first 60 chars) to avoid RSS + NewsAPI overlap
  const seen = new Set<string>();
  const items = [...rssItems, ...newsApiItems]
    .filter((item) => {
      const key = item.title.slice(0, 60).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 150);

  cache = { items, at: Date.now() };
  return items;
}

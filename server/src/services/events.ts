export type EventType =
  | "INDEX_REBALANCE"
  | "FO_EXPIRY"
  | "RBI_POLICY"
  | "ECONOMIC_DATA"
  | "GLOBAL"
  | "IPO"
  | "CORPORATE"
  | "HOLIDAY";

export interface MarketEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  type: EventType;
  impact: "HIGH" | "MEDIUM" | "LOW";
  affectedSymbols?: string[];
  source?: string;
}

// Returns the last Thursday of a given month (0-indexed month)
function lastThursday(year: number, month: number): string {
  const lastDay = new Date(year, month + 1, 0);
  const dow = lastDay.getDay(); // 0=Sun, 4=Thu
  const delta = (dow - 4 + 7) % 7;
  const thu = new Date(year, month + 1, -delta);
  return thu.toISOString().split("T")[0];
}

function foExpiries(monthsAhead: number): MarketEvent[] {
  const now = new Date();
  const events: MarketEvent[] = [];
  for (let i = 0; i <= monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const dateStr = lastThursday(y, m);
    const label = d.toLocaleString("en-IN", { month: "long", year: "numeric" });
    events.push({
      id: `fo-${y}-${String(m + 1).padStart(2, "0")}`,
      date: dateStr,
      title: `NSE F&O Monthly Expiry — ${label}`,
      description:
        "Monthly Futures & Options contracts expire. Expect elevated volatility in the final 30 minutes. Weekly Nifty and BankNifty options also expire on this date. Roll activity picks up 2–3 days prior.",
      type: "FO_EXPIRY",
      impact: "HIGH",
      affectedSymbols: ["NIFTY50", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"],
      source: "NSE",
    });
  }
  return events;
}

// Curated list of known major market-moving events for Indian markets
const CURATED_EVENTS: MarketEvent[] = [
  // ── Index Rebalancings ──────────────────────────────────────────────────────
  {
    id: "msci-may26-effective",
    date: "2026-05-29",
    title: "MSCI May 2026 Semi-Annual Index Review — Effective",
    description:
      "MSCI Semi-Annual Index Review for May 2026 takes effect at market close today. Passive funds globally rebalance to reflect additions and deletions. Indian stocks in/out of MSCI EM and MSCI India indices will see large block flows. Expect above-average volumes in affected counters.",
    type: "INDEX_REBALANCE",
    impact: "HIGH",
    affectedSymbols: ["NIFTY50", "BSE500", "MIDCAP150"],
    source: "MSCI",
  },
  {
    id: "ftse-jun26",
    date: "2026-06-20",
    title: "FTSE Russell Quarterly Index Review — Effective",
    description:
      "FTSE Russell FTSE Emerging Markets and FTSE India indices quarterly rebalancing takes effect. Affected securities see passive rebalancing flows from global ETFs and funds tracking FTSE benchmarks.",
    type: "INDEX_REBALANCE",
    impact: "MEDIUM",
    affectedSymbols: ["NIFTY50", "BSE200"],
    source: "FTSE Russell",
  },
  {
    id: "msci-aug26-quarterly",
    date: "2026-08-28",
    title: "MSCI August 2026 Quarterly Index Review — Effective",
    description:
      "MSCI Quarterly Index Review (August cycle). Smaller in scope than semi-annual reviews — typically involves weight changes and pro forma adjustments rather than large additions/deletions.",
    type: "INDEX_REBALANCE",
    impact: "MEDIUM",
    affectedSymbols: ["NIFTY50", "MSCI India"],
    source: "MSCI",
  },
  {
    id: "nifty-rebalance-sep26",
    date: "2026-09-25",
    title: "Nifty 50 Semi-Annual Index Rebalancing",
    description:
      "NSE conducts the September semi-annual Nifty 50 index rebalancing. Any changes to Nifty 50 constituents are announced ~4 weeks in advance and become effective this date.",
    type: "INDEX_REBALANCE",
    impact: "HIGH",
    affectedSymbols: ["NIFTY50"],
    source: "NSE India",
  },

  // ── RBI Policy ──────────────────────────────────────────────────────────────
  {
    id: "rbi-mpc-jun26",
    date: "2026-06-06",
    title: "RBI Monetary Policy Committee — Rate Decision",
    description:
      "Reserve Bank of India MPC announces its bi-monthly interest rate decision. Markets will focus on the repo rate, stance change, and Governor's forward guidance on inflation, growth, and rupee. Banking and rate-sensitive sectors will be in focus.",
    type: "RBI_POLICY",
    impact: "HIGH",
    affectedSymbols: ["BANKNIFTY", "NIFTY BANK", "NIFTY50", "NIFTYPSE"],
    source: "RBI",
  },
  {
    id: "rbi-mpc-aug26",
    date: "2026-08-07",
    title: "RBI Monetary Policy Committee — Rate Decision",
    description:
      "Reserve Bank of India MPC August bi-monthly policy meeting. Second MPC meeting of the financial year. Watch for any rate action following Q1 FY27 GDP print and monsoon progress.",
    type: "RBI_POLICY",
    impact: "HIGH",
    affectedSymbols: ["BANKNIFTY", "NIFTY BANK", "NIFTY50"],
    source: "RBI",
  },
  {
    id: "rbi-mpc-oct26",
    date: "2026-10-09",
    title: "RBI Monetary Policy Committee — Rate Decision",
    description:
      "RBI MPC October bi-monthly policy meeting. Post-festive season review — consumption data and kharif harvest outlook will inform the MPC's stance.",
    type: "RBI_POLICY",
    impact: "HIGH",
    affectedSymbols: ["BANKNIFTY", "NIFTY BANK", "NIFTY50"],
    source: "RBI",
  },

  // ── Economic Data ────────────────────────────────────────────────────────────
  {
    id: "india-gdp-q4fy26",
    date: "2026-05-29",
    title: "India Q4 FY26 GDP & FY26 Annual GDP Data Release",
    description:
      "Ministry of Statistics releases India's Q4 FY26 (Jan–Mar 2026) GDP growth estimate alongside full-year FY26 data. A key macro reading that shapes RBI's rate path and government fiscal stance.",
    type: "ECONOMIC_DATA",
    impact: "HIGH",
    affectedSymbols: ["NIFTY50", "NIFTYINFRA", "NIFTYREALTY"],
    source: "MoSPI",
  },
  {
    id: "india-cpi-jun26",
    date: "2026-06-12",
    title: "India May 2026 CPI Inflation Data",
    description:
      "Consumer Price Index (CPI) inflation data for May 2026 released by MoSPI. Core inflation and food inflation breakdown closely watched ahead of RBI MPC meeting.",
    type: "ECONOMIC_DATA",
    impact: "MEDIUM",
    affectedSymbols: ["NIFTY50", "BANKNIFTY"],
    source: "MoSPI",
  },
  {
    id: "us-nfp-jun26",
    date: "2026-06-05",
    title: "US Non-Farm Payrolls — May 2026",
    description:
      "US Bureau of Labor Statistics releases May 2026 Non-Farm Payroll data. Strong/weak NFP shifts Fed rate expectations globally, impacting FII flows into emerging markets including India.",
    type: "GLOBAL",
    impact: "HIGH",
    affectedSymbols: ["NIFTY50", "USDINR"],
    source: "US BLS",
  },
  {
    id: "us-fomc-jun26",
    date: "2026-06-17",
    title: "US FOMC Meeting — Rate Decision",
    description:
      "Federal Reserve FOMC June policy meeting concludes with a rate decision and Fed Chair press conference. Fed guidance on the rate path is the single biggest driver of global risk appetite and EM fund flows.",
    type: "GLOBAL",
    impact: "HIGH",
    affectedSymbols: ["NIFTY50", "BANKNIFTY", "USDINR"],
    source: "US Federal Reserve",
  },
  {
    id: "us-fomc-jul26",
    date: "2026-07-29",
    title: "US FOMC Meeting — Rate Decision",
    description:
      "Federal Reserve July FOMC meeting. Mid-cycle check-in following Q2 US GDP and PCE data. EM asset flows sensitive to any change in forward guidance.",
    type: "GLOBAL",
    impact: "HIGH",
    affectedSymbols: ["NIFTY50", "USDINR"],
    source: "US Federal Reserve",
  },
  {
    id: "india-gdp-q1fy27",
    date: "2026-08-28",
    title: "India Q1 FY27 GDP Advance Estimate",
    description:
      "First advance estimate of India's GDP growth for Q1 FY27 (Apr–Jun 2026). Sets the narrative for the full fiscal year outlook and influences RBI's October MPC stance.",
    type: "ECONOMIC_DATA",
    impact: "HIGH",
    affectedSymbols: ["NIFTY50", "NIFTYINFRA"],
    source: "MoSPI",
  },
  {
    id: "india-union-budget-fy28",
    date: "2027-02-01",
    title: "Union Budget FY2027-28",
    description:
      "Finance Minister presents the full Union Budget for FY2027-28. The single largest annual market-moving event for Indian equities. Sector allocations, capital gains tax changes, and fiscal deficit target drive sectoral rotation.",
    type: "ECONOMIC_DATA",
    impact: "HIGH",
    affectedSymbols: ["NIFTY50", "BANKNIFTY", "NIFTYINFRA", "NIFTYDEFENCE", "NIFTYPHARMA"],
    source: "Ministry of Finance",
  },

  // ── Global Events ────────────────────────────────────────────────────────────
  {
    id: "india-monsoon-onset",
    date: "2026-06-01",
    title: "Southwest Monsoon Onset — Kerala",
    description:
      "IMD's official onset of the southwest monsoon over Kerala. Normal onset date is June 1. Monsoon progress impacts agricultural output, rural consumption demand, food inflation, and overall market sentiment.",
    type: "GLOBAL",
    impact: "MEDIUM",
    affectedSymbols: ["NIFTYAGRI", "NIFTY50", "NIFTYFMCG"],
    source: "IMD",
  },
];

let cache: { items: MarketEvent[]; at: number } = { items: [], at: 0 };
const CACHE_TTL = 60 * 60_000; // 1 hour — events are nearly static

export function getEvents(): MarketEvent[] {
  if (Date.now() - cache.at < CACHE_TTL && cache.items.length > 0) {
    return cache.items;
  }

  const foEvents = foExpiries(5); // next 5 months of F&O expiries
  const allEvents = [...CURATED_EVENTS, ...foEvents];

  // Deduplicate by id, then sort by date ascending
  const seen = new Set<string>();
  const deduped = allEvents.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  deduped.sort((a, b) => a.date.localeCompare(b.date));

  cache = { items: deduped, at: Date.now() };
  return deduped;
}

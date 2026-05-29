export interface Tick {
  instrument_token: number;
  last_price: number;
  change?: number;
  volume?: number;
  oi?: number;
  ohlc?: { open: number; high: number; low: number; close: number };
  depth?: {
    buy: { price: number; quantity: number; orders: number }[];
    sell: { price: number; quantity: number; orders: number }[];
  };
}

export interface Quote {
  instrument_token: number;
  last_price: number;
  change: number;
  volume: number;
  oi: number;
  ohlc: { open: number; high: number; low: number; close: number };
}

export interface Candle {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Instrument {
  instrument_token: number;
  tradingsymbol: string;
  name: string;
  exchange: string;
  segment: string;
  instrument_type: string;
  lot_size: number;
}

export interface OptionLeg {
  token: number;
  symbol: string;
  ltp: number;
  oi: number;
  oiChange: number;
  volume: number;
  bid: number;
  ask: number;
  lotSize: number;
  iv?: number;
}

export interface OptionStrike {
  strike: number;
  CE: OptionLeg | null;
  PE: OptionLeg | null;
}

export interface OptionsChainData {
  expiries: string[];
  selectedExpiry: string;
  strikes: OptionStrike[];
  spot: number;
}

export interface GlobalIndex {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePct: number;
}

export interface FuturesInstrument {
  token: number;
  symbol: string;
  name: string;
  exchange: string;
  expiry: string;
}

export type NewsCategory = "RBI" | "MACRO" | "GLOBAL" | "CORPORATE" | "MARKETS" | "BUDGET" | "SECTOR" | "WAR" | "OIL" | "HEALTH" | "GENERAL";
export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";

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
  date: string;
  title: string;
  description: string;
  type: EventType;
  impact: ImpactLevel;
  affectedSymbols?: string[];
  source?: string;
}

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
  category: NewsCategory;
  impact: ImpactLevel;
}

export interface WatchlistItem {
  symbol: string;
  exchange: string;
  token: number;
  displayName: string;
}

export type MarketStatus = "pre-open" | "open" | "closed" | "post-close";

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
  breadth: number;
  stockCount: number;
  topPerformers: ThemeStock[];
  newsCount: number;
  keyNews: string[];
  driver: string;
  analysis: string;
  tradingAngle: string;
  momentum: ThemeMomentum;
}

export interface StockIdea {
  id: string;
  symbol: string;
  exchange: string;
  bias: "BUY" | "SELL";
  entry: string;
  target: string;
  stop_loss: string;
  reason: string;
}

export interface OptionsIdea {
  id: string;
  instrument: string;
  expiry: string;
  bias: "BUY" | "SELL";
  entry: string;
  target: string;
  stop_loss: string;
  reason: string;
}

export interface IndexIdea {
  id: string;
  index: string;        // e.g. "NIFTY 50", "BANKNIFTY"
  instrument: string;   // e.g. "NIFTY FUT" or "NIFTY spot"
  bias: "BUY" | "SELL";
  entry: string;
  target: string;
  stop_loss: string;
  reason: string;
}

export interface MarketPulse {
  _id: string;
  generatedAt: string;
  market_bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  summary: string;
  key_themes: string[];
  bullish_sectors: string[];
  bearish_sectors: string[];
  index_ideas: IndexIdea[];
  stock_ideas: StockIdea[];
  options_ideas: OptionsIdea[];
}

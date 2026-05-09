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

export type NewsCategory = "RBI" | "MACRO" | "GLOBAL" | "CORPORATE" | "MARKETS" | "BUDGET" | "SECTOR" | "GENERAL";
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

export interface WatchlistItem {
  symbol: string;
  exchange: string;
  token: number;
  displayName: string;
}

export type MarketStatus = "pre-open" | "open" | "closed" | "post-close";

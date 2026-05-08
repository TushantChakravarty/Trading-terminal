import { create } from "zustand";
import { Tick, WatchlistItem } from "../types";

interface TerminalStore {
  isAuthenticated: boolean;
  profile: any | null;
  ticks: Record<number, Tick>;
  watchlist: WatchlistItem[];
  selectedSymbol: string;
  selectedToken: number | null;
  activePanel: "chart" | "options" | "signals" | "news";

  setAuth: (authenticated: boolean, profile?: any) => void;
  updateTicks: (ticks: Tick[]) => void;
  setSelectedSymbol: (symbol: string, token: number) => void;
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (symbol: string) => void;
  setActivePanel: (panel: "chart" | "options" | "signals" | "news") => void;
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: "NIFTY 50", exchange: "NSE", token: 256265, displayName: "NIFTY" },
  { symbol: "NIFTY BANK", exchange: "NSE", token: 260105, displayName: "BANKNIFTY" },
  { symbol: "INDIA VIX", exchange: "NSE", token: 264969, displayName: "INDIA VIX" },
  { symbol: "RELIANCE", exchange: "NSE", token: 738561, displayName: "RELIANCE" },
  { symbol: "TCS", exchange: "NSE", token: 2953217, displayName: "TCS" },
  { symbol: "HDFCBANK", exchange: "NSE", token: 341249, displayName: "HDFC BANK" },
  { symbol: "INFY", exchange: "NSE", token: 408065, displayName: "INFOSYS" },
  { symbol: "ICICIBANK", exchange: "NSE", token: 1270529, displayName: "ICICI BANK" },
];

export const useTerminalStore = create<TerminalStore>((set) => ({
  isAuthenticated: false,
  profile: null,
  ticks: {},
  watchlist: DEFAULT_WATCHLIST,
  selectedSymbol: "NSE:NIFTY 50",
  selectedToken: 256265,
  activePanel: "chart",

  setAuth: (authenticated, profile = null) =>
    set({ isAuthenticated: authenticated, profile }),

  updateTicks: (ticks) =>
    set((state) => {
      const updated = { ...state.ticks };
      ticks.forEach((t) => {
        updated[t.instrument_token] = t;
      });
      return { ticks: updated };
    }),

  setSelectedSymbol: (symbol, token) =>
    set({ selectedSymbol: symbol, selectedToken: token }),

  addToWatchlist: (item) =>
    set((state) => ({
      watchlist: state.watchlist.find((w) => w.symbol === item.symbol)
        ? state.watchlist
        : [...state.watchlist, item],
    })),

  removeFromWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.filter((w) => w.symbol !== symbol),
    })),

  setActivePanel: (panel) => set({ activePanel: panel }),
}));

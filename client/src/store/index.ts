import { create } from "zustand";
import axios from "axios";
import { Tick, WatchlistItem } from "../types";

const TOKEN_KEY = "app_token";

// Apply stored token to axios on module load (survives page refresh)
const _savedToken = localStorage.getItem(TOKEN_KEY);
if (_savedToken) {
  axios.defaults.headers.common["x-app-token"] = _savedToken;
}

interface TerminalStore {
  appToken: string | null;
  isAuthenticated: boolean;
  profile: any | null;
  ticks: Record<number, Tick>;
  watchlist: WatchlistItem[];
  selectedSymbol: string;
  selectedToken: number | null;
  activePanel: "chart" | "options" | "signals" | "news" | "watchlist";

  setAppToken: (token: string | null) => void;
  setAuth: (authenticated: boolean, profile?: any) => void;
  updateTicks: (ticks: Tick[]) => void;
  setSelectedSymbol: (symbol: string, token: number) => void;
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (symbol: string) => void;
  setActivePanel: (panel: "chart" | "options" | "signals" | "news" | "watchlist") => void;
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
  appToken: _savedToken,
  isAuthenticated: false,
  profile: null,
  ticks: {},
  watchlist: DEFAULT_WATCHLIST,
  selectedSymbol: "NSE:NIFTY 50",
  selectedToken: 256265,
  activePanel: "chart",

  setAppToken: (token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      axios.defaults.headers.common["x-app-token"] = token;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      delete axios.defaults.headers.common["x-app-token"];
    }
    set({ appToken: token });
  },

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

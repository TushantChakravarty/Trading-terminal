import { useEffect, useRef, useState } from "react";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { X, Globe, TrendingUp, Plus, Search, Loader2 } from "lucide-react";
import { useTerminalStore } from "../../store";
import { GlobalIndex, FuturesInstrument, Instrument } from "../../types";

// ── Fixed Indian indices (always subscribed on auth) ─────────────────────────

const INDIAN_INDICES = [
  { token: 256265, displayName: "NIFTY 50",   exchange: "NSE", symbol: "NSE:NIFTY 50"   },
  { token: 260105, displayName: "BANK NIFTY",  exchange: "NSE", symbol: "NSE:NIFTY BANK" },
  { token: 265,    displayName: "SENSEX",       exchange: "BSE", symbol: "BSE:SENSEX"     },
  { token: 264969, displayName: "INDIA VIX",   exchange: "NSE", symbol: "NSE:INDIA VIX"  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(ltp: number, close: number) {
  if (!close) return 0;
  return ((ltp - close) / close) * 100;
}

function fmtPrice(n: number, decimals = 2) {
  if (!n) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
}

function fmtPct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label, icon, action }: { label: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="px-3 py-1 bg-terminal-bg/60 border-b border-terminal-border flex items-center gap-1">
      {icon}
      <span className="text-[9px] text-terminal-muted tracking-widest font-medium flex-1">{label}</span>
      {action}
    </div>
  );
}

// ── Indian index row (tick-driven) ────────────────────────────────────────────

function IndexRow({ token, displayName, exchange, symbol }: typeof INDIAN_INDICES[0]) {
  const { ticks, selectedToken, setSelectedSymbol } = useTerminalStore();
  const tick  = ticks[token];
  const ltp   = tick?.last_price ?? 0;
  const close = tick?.ohlc?.close ?? 0;
  const chg   = pct(ltp, close);
  const isUp  = chg >= 0;
  const isSelected = selectedToken === token;

  return (
    <div
      onClick={() => setSelectedSymbol(symbol, token)}
      className={`flex items-center justify-between px-3 py-2 cursor-pointer border-b border-terminal-border/40 hover:bg-terminal-header transition-colors ${
        isSelected ? "bg-terminal-header border-l-2 border-l-terminal-blue" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-terminal-text text-xs font-medium truncate">{displayName}</div>
        <div className="text-terminal-muted text-[9px]">{exchange}</div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <div className="text-terminal-text text-xs tabular-nums">{ltp > 0 ? fmtPrice(ltp) : "—"}</div>
        {ltp > 0 && (
          <div className={`text-[10px] tabular-nums ${isUp ? "text-terminal-green" : "text-terminal-red"}`}>
            {fmtPct(chg)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Futures row (tick-driven, token fetched dynamically) ──────────────────────

function FuturesRow({ fut }: { fut: FuturesInstrument }) {
  const { ticks, selectedToken, setSelectedSymbol } = useTerminalStore();
  const tick  = ticks[fut.token];
  const ltp   = tick?.last_price ?? 0;
  const close = tick?.ohlc?.close ?? 0;
  const chg   = pct(ltp, close);
  const isUp  = chg >= 0;
  const isSelected = selectedToken === fut.token;

  return (
    <div
      onClick={() => setSelectedSymbol(`${fut.exchange}:${fut.symbol}`, fut.token)}
      className={`flex items-center justify-between px-3 py-2 cursor-pointer border-b border-terminal-border/40 hover:bg-terminal-header transition-colors ${
        isSelected ? "bg-terminal-header border-l-2 border-l-terminal-blue" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-terminal-text text-xs font-medium truncate">{fut.name}</div>
        <div className="text-terminal-muted text-[9px]">{fut.expiry}</div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <div className="text-terminal-text text-xs tabular-nums">{ltp > 0 ? fmtPrice(ltp) : "—"}</div>
        {ltp > 0 && (
          <div className={`text-[10px] tabular-nums ${isUp ? "text-terminal-green" : "text-terminal-red"}`}>
            {fmtPct(chg)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Global index row (REST-polled, no Kite tick) ──────────────────────────────

function GlobalRow({ idx }: { idx: GlobalIndex }) {
  const isUp = idx.changePct >= 0;
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border/40">
      <div className="flex-1 min-w-0">
        <div className="text-terminal-text text-xs font-medium truncate">{idx.name}</div>
        <div className="text-terminal-muted text-[9px]">{idx.exchange}</div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <div className="text-terminal-text text-xs tabular-nums">
          {idx.price > 0 ? idx.price.toLocaleString("en", { maximumFractionDigits: 2 }) : "—"}
        </div>
        {idx.price > 0 && (
          <div className={`text-[10px] tabular-nums ${isUp ? "text-terminal-green" : "text-terminal-red"}`}>
            {fmtPct(idx.changePct)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stock row (tick-driven, removable) ────────────────────────────────────────

function StockRow({ item }: { item: { symbol: string; exchange: string; token: number; displayName: string } }) {
  const { ticks, selectedToken, setSelectedSymbol, removeFromWatchlist } = useTerminalStore();
  const tick  = ticks[item.token];
  const ltp   = tick?.last_price ?? 0;
  const close = tick?.ohlc?.close ?? 0;
  const chg   = pct(ltp, close);
  const isUp  = chg >= 0;
  const isSelected = selectedToken === item.token;

  return (
    <div
      onClick={() => setSelectedSymbol(`${item.exchange}:${item.symbol}`, item.token)}
      className={`group flex items-center justify-between px-3 py-2 cursor-pointer border-b border-terminal-border/40 hover:bg-terminal-header transition-colors ${
        isSelected ? "bg-terminal-header border-l-2 border-l-terminal-blue" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-terminal-text text-xs font-medium truncate">{item.displayName}</div>
        <div className="text-terminal-muted text-[9px]">{item.exchange}</div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <div className="text-terminal-text text-xs tabular-nums">{ltp > 0 ? fmtPrice(ltp) : "—"}</div>
        {ltp > 0 && (
          <div className={`text-[10px] tabular-nums ${isUp ? "text-terminal-green" : "text-terminal-red"}`}>
            {fmtPct(chg)}
          </div>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.symbol); }}
        className="ml-1 text-terminal-muted opacity-0 group-hover:opacity-100 hover:text-terminal-red transition-all"
      >
        <X size={10} />
      </button>
    </div>
  );
}

// ── Instrument search ─────────────────────────────────────────────────────────

function InstrumentSearch({ onClose }: { onClose: () => void }) {
  const { addToWatchlist, watchlist } = useTerminalStore();
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results, isFetching } = useQuery<Instrument[]>({
    queryKey: ["instrument-search", debouncedQ],
    queryFn: () =>
      axios.get(`/api/quotes/instruments/NSE?q=${encodeURIComponent(debouncedQ)}`).then((r) => r.data),
    enabled: debouncedQ.length >= 2,
    staleTime: 30_000,
  });

  const alreadyAdded = new Set(watchlist.map((w) => w.symbol));

  function handleAdd(inst: Instrument) {
    addToWatchlist({
      symbol:      inst.tradingsymbol,
      exchange:    inst.exchange,
      token:       inst.instrument_token,
      displayName: inst.name || inst.tradingsymbol,
    });
    onClose();
  }

  return (
    <div className="border-b border-terminal-border bg-terminal-bg">
      {/* Search input */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-terminal-border/60">
        <Search size={10} className="text-terminal-muted shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search NSE symbol..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          className="flex-1 bg-transparent text-[11px] text-terminal-text placeholder:text-terminal-muted focus:outline-none"
        />
        {isFetching && <Loader2 size={9} className="animate-spin text-terminal-muted shrink-0" />}
        <button onClick={onClose} className="text-terminal-muted hover:text-terminal-red transition-colors">
          <X size={10} />
        </button>
      </div>

      {/* Results */}
      {results && results.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          {results.slice(0, 20).map((inst) => {
            const added = alreadyAdded.has(inst.tradingsymbol);
            return (
              <button
                key={inst.instrument_token}
                onClick={() => !added && handleAdd(inst)}
                disabled={added}
                className={`w-full flex items-center justify-between px-3 py-1.5 border-b border-terminal-border/30 text-left transition-colors ${
                  added
                    ? "opacity-40 cursor-default"
                    : "hover:bg-terminal-header cursor-pointer"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-terminal-text font-medium truncate">{inst.tradingsymbol}</div>
                  {inst.name && (
                    <div className="text-[9px] text-terminal-muted truncate">{inst.name}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[9px] text-terminal-dim">{inst.instrument_type}</span>
                  {added
                    ? <span className="text-[9px] text-terminal-muted">added</span>
                    : <Plus size={9} className="text-terminal-blue" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {debouncedQ.length >= 2 && !isFetching && results?.length === 0 && (
        <div className="px-3 py-2 text-[10px] text-terminal-muted">No results for "{debouncedQ}"</div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function Watchlist() {
  const { watchlist, isAuthenticated, setAdditionalTokens } = useTerminalStore();
  const [showSearch, setShowSearch] = useState(false);

  // Futures — fetch near-month tokens then expose them for subscription
  const { data: futures } = useQuery<FuturesInstrument[]>({
    queryKey: ["market-futures"],
    queryFn: () => axios.get("/api/market/futures").then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  useEffect(() => {
    if (futures?.length) {
      setAdditionalTokens(futures.map((f) => f.token));
    }
  }, [futures]);

  // Global indices — poll every 60s
  const { data: globalIndices } = useQuery<GlobalIndex[]>({
    queryKey: ["market-global"],
    queryFn: () => axios.get("/api/market/global").then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return (
    <div className="flex flex-col h-full bg-terminal-panel border-r border-terminal-border w-full md:w-52 md:shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border shrink-0">
        <span className="text-terminal-dim text-xs tracking-widest font-medium">MARKETS</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Indian Indices ── */}
        <SectionLabel label="INDICES" />
        {INDIAN_INDICES.map((idx) => (
          <IndexRow key={idx.token} {...idx} />
        ))}

        {/* ── Futures ── */}
        {futures && futures.length > 0 && (
          <>
            <SectionLabel label="FUTURES" icon={<TrendingUp size={8} className="text-terminal-muted" />} />
            {futures.map((f) => (
              <FuturesRow key={f.token} fut={f} />
            ))}
          </>
        )}

        {/* ── Global Markets ── */}
        {globalIndices && globalIndices.length > 0 && (
          <>
            <SectionLabel label="GLOBAL" icon={<Globe size={8} className="text-terminal-muted" />} />
            {globalIndices.map((idx) => (
              <GlobalRow key={idx.symbol} idx={idx} />
            ))}
          </>
        )}

        {/* ── Stocks ── */}
        <SectionLabel
          label="STOCKS"
          action={
            <button
              onClick={() => setShowSearch((v) => !v)}
              className="text-terminal-muted hover:text-terminal-blue transition-colors"
              title="Add symbol"
            >
              <Plus size={10} />
            </button>
          }
        />

        {showSearch && <InstrumentSearch onClose={() => setShowSearch(false)} />}

        {watchlist.map((item) => (
          <StockRow key={item.symbol} item={item} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-terminal-border shrink-0">
        <p className="text-terminal-muted text-[10px]">
          {INDIAN_INDICES.length + (futures?.length ?? 0)} indices · {watchlist.length} stocks
        </p>
      </div>
    </div>
  );
}

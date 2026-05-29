import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { RefreshCw, TrendingUp, AlertCircle, SlidersHorizontal } from "lucide-react";
import type { MoversResult, SectorGroup, MoverStock } from "../../types";

export type StockSelectHandler = (symbol: string, name: string) => void;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function returnColor(r: number): string {
  if (r >= 20) return "text-emerald-400";
  if (r >= 10) return "text-terminal-green";
  if (r >= 5)  return "text-green-400";
  return "text-terminal-green/70";
}

function returnBg(r: number): string {
  if (r >= 20) return "bg-emerald-500/15 border-emerald-500/30";
  if (r >= 10) return "bg-terminal-green/15 border-terminal-green/30";
  if (r >= 5)  return "bg-green-500/10 border-green-500/20";
  return "bg-green-500/5 border-green-500/15";
}

// ── Stock chip ────────────────────────────────────────────────────────────────

function StockChip({ stock, onSelect }: { stock: MoverStock; onSelect: StockSelectHandler }) {
  return (
    <button
      onClick={() => onSelect(stock.symbol, stock.name)}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded border ${returnBg(stock.return1M)} hover:brightness-125 transition-all text-left`}
    >
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-terminal-text tracking-wide truncate">
            {stock.name}
          </span>
          <span className={`text-[8px] font-bold px-1 py-0.5 rounded tracking-wider shrink-0 ${
            stock.cap === "MIDCAP"
              ? "bg-terminal-blue/20 text-terminal-blue border border-terminal-blue/30"
              : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
          }`}>
            {stock.cap === "MIDCAP" ? "MC" : "SC"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[11px] font-mono font-bold tabular-nums ${returnColor(stock.return1M)}`}>
            {fmt(stock.return1M)}
          </span>
          {stock.ltp > 0 && (
            <span className="text-[9px] text-terminal-muted tabular-nums">
              ₹{stock.ltp.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Sector group card ─────────────────────────────────────────────────────────

function SectorCard({ group, rank, capFilter, onSelect }: {
  group: SectorGroup;
  rank: number;
  capFilter: "ALL" | "MIDCAP" | "SMALLCAP";
  onSelect: StockSelectHandler;
}) {
  const visible = capFilter === "ALL"
    ? group.stocks
    : group.stocks.filter((s) => s.cap === capFilter);

  if (visible.length === 0) return null;

  const avgReturn = visible.reduce((s, r) => s + r.return1M, 0) / visible.length;

  return (
    <div className="border border-terminal-border/50 rounded-sm bg-terminal-panel">
      {/* Sector header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-terminal-border/30">
        <span className="text-[9px] text-terminal-muted w-5 shrink-0">#{rank}</span>
        <span className="text-[11px] font-semibold text-terminal-text tracking-wide flex-1">
          {group.sector}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-terminal-muted">
            {visible.length} stock{visible.length !== 1 ? "s" : ""}
          </span>
          <span className={`text-[11px] font-mono font-bold tabular-nums ${returnColor(avgReturn)}`}>
            {fmt(avgReturn)} avg
          </span>
        </div>
      </div>

      {/* Stock chips */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2">
        {visible.map((s) => (
          <StockChip key={s.symbol} stock={s} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type CapFilter  = "ALL" | "MIDCAP" | "SMALLCAP";
type RetFilter  = 3 | 5 | 10 | 20;

export function MoversList({ onSelectStock }: { onSelectStock: StockSelectHandler }) {
  const [capFilter, setCapFilter]   = useState<CapFilter>("ALL");
  const [minReturn, setMinReturn]   = useState<RetFilter>(3);

  const { data, isLoading, isFetching, refetch } = useQuery<MoversResult>({
    queryKey: ["movers", minReturn],
    queryFn: () => axios.get(`/api/movers?minReturn=${minReturn}`).then((r) => r.data),
    refetchInterval: 30 * 60_000,
    staleTime: 20 * 60_000,
  });

  const visibleSectors: SectorGroup[] = (data?.sectors ?? [])
    .filter((g) =>
      capFilter === "ALL" ? true : g.stocks.some((s) => s.cap === capFilter)
    );

  const totalVisible = visibleSectors.reduce((sum, g) => {
    const count = capFilter === "ALL" ? g.count : g.stocks.filter((s) => s.cap === capFilter).length;
    return sum + count;
  }, 0);

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-terminal-border/40 shrink-0 flex-wrap">
        {/* Cap filter */}
        <div className="flex gap-1">
          {(["ALL", "MIDCAP", "SMALLCAP"] as CapFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setCapFilter(f)}
              className={`px-2 py-0.5 text-[9px] tracking-widest rounded border whitespace-nowrap transition-colors ${
                capFilter === f
                  ? f === "MIDCAP"
                    ? "border-terminal-blue text-terminal-blue bg-terminal-blue/10"
                    : f === "SMALLCAP"
                    ? "border-purple-400 text-purple-400 bg-purple-500/10"
                    : "border-terminal-blue text-terminal-blue bg-terminal-blue/10"
                  : "border-terminal-border/40 text-terminal-muted hover:text-terminal-dim"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Min return filter */}
        <div className="flex items-center gap-1">
          <SlidersHorizontal size={9} className="text-terminal-muted shrink-0" />
          {([3, 5, 10, 20] as RetFilter[]).map((r) => (
            <button
              key={r}
              onClick={() => setMinReturn(r)}
              className={`px-1.5 py-0.5 text-[9px] tracking-wider rounded border transition-colors ${
                minReturn === r
                  ? "border-terminal-green text-terminal-green bg-terminal-green/10"
                  : "border-terminal-border/40 text-terminal-muted hover:text-terminal-dim"
              }`}
            >
              +{r}%
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Summary counts */}
        {data && (
          <div className="flex items-center gap-2 text-[9px]">
            <span className="text-terminal-green font-bold">
              {totalVisible} rallied
            </span>
            {capFilter === "ALL" && (
              <>
                <span className="text-terminal-blue">{data.midcapRallied} MC</span>
                <span className="text-purple-400">{data.smallcapRallied} SC</span>
              </>
            )}
          </div>
        )}

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-terminal-dim hover:text-terminal-text transition-colors"
        >
          <RefreshCw size={10} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-terminal-dim">
          <RefreshCw size={14} className="animate-spin" />
          <span className="text-xs tracking-widest">SCANNING ~120 STOCKS...</span>
          <span className="text-[10px] text-terminal-muted">
            fetching 1-month history for midcap & smallcap universe
          </span>
        </div>
      ) : !data || visibleSectors.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-terminal-muted">
          <AlertCircle size={14} />
          <span className="text-xs tracking-widest">
            {!data ? "NO DATA — REQUIRES ZERODHA LOGIN" : `NO STOCKS UP >${minReturn}% IN 1M`}
          </span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {/* Sector legend */}
          <div className="flex items-center gap-2 px-1 mb-1">
            <TrendingUp size={10} className="text-terminal-green" />
            <span className="text-[9px] text-terminal-muted tracking-wider">
              SECTORS SORTED BY AVG 1-MONTH RETURN · {visibleSectors.length} SECTORS
            </span>
          </div>

          {visibleSectors.map((group, i) => (
            <SectorCard
              key={group.sector}
              group={group}
              rank={i + 1}
              capFilter={capFilter}
              onSelect={onSelectStock}
            />
          ))}
        </div>
      )}
    </div>
  );
}

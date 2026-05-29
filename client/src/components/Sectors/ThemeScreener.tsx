import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { RefreshCw, Flame, TrendingUp, TrendingDown, Minus, AlertCircle, Zap } from "lucide-react";
import type { ThemeAnalysis, ThemeMomentum } from "../../types";
import type { StockSelectHandler } from "./MoversList";

// ── Config ─────────────────────────────────────────────────────────────────────

const MOMENTUM_CONFIG: Record<
  ThemeMomentum,
  { label: string; icon: any; text: string; bg: string; border: string; leftBorder: string }
> = {
  STRONG:   { label: "STRONG",   icon: Flame,      text: "text-terminal-green",  bg: "bg-terminal-green/10",  border: "border-terminal-green/30",  leftBorder: "border-l-terminal-green"  },
  MODERATE: { label: "MODERATE", icon: TrendingUp,  text: "text-terminal-blue",   bg: "bg-terminal-blue/10",   border: "border-terminal-blue/30",   leftBorder: "border-l-terminal-blue"   },
  WEAK:     { label: "WEAK",     icon: Minus,       text: "text-terminal-yellow", bg: "bg-terminal-yellow/10", border: "border-terminal-yellow/30", leftBorder: "border-l-terminal-yellow" },
  NEGATIVE: { label: "NEGATIVE", icon: TrendingDown,text: "text-terminal-red",    bg: "bg-terminal-red/10",    border: "border-terminal-red/30",    leftBorder: "border-l-terminal-red"    },
};

type MomentumFilter = ThemeMomentum | "ALL";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 1): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(decimals)}%`;
}

function BreadthBar({ breadth, count }: { breadth: number; count: number }) {
  const pct = Math.round(breadth * 100);
  const positive = Math.round(breadth * count);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-terminal-border/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            breadth >= 0.7 ? "bg-terminal-green/70" :
            breadth >= 0.5 ? "bg-terminal-blue/70" :
            "bg-terminal-red/60"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] text-terminal-muted tabular-nums whitespace-nowrap">
        {positive}/{count} stocks ↑
      </span>
    </div>
  );
}

// ── Theme Card ─────────────────────────────────────────────────────────────────

function ThemeCard({ theme, rank, onSelect }: { theme: ThemeAnalysis; rank: number; onSelect: StockSelectHandler }) {
  const [expanded, setExpanded] = useState(false);
  const conf = MOMENTUM_CONFIG[theme.momentum];
  const Icon = conf.icon;
  const isStrong = theme.momentum === "STRONG";

  return (
    <div
      className={`border-l-2 ${conf.leftBorder} border border-terminal-border/40 rounded-sm ${
        isStrong ? "bg-terminal-green/5" : "bg-terminal-panel"
      } hover:bg-terminal-header/40 transition-colors`}
    >
      {/* ── Header ── */}
      <button onClick={() => setExpanded((p) => !p)} className="w-full text-left px-3 pt-2.5 pb-1.5">
        <div className="flex items-start gap-2">
          {/* Rank */}
          <span className="text-[9px] text-terminal-muted mt-0.5 w-4 shrink-0">#{rank}</span>

          <div className="flex-1 min-w-0">
            {/* Row 1: name + momentum badge + return */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-terminal-text tracking-wide">
                {theme.shortName}
              </span>
              <span
                className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold tracking-widest rounded border ${conf.bg} ${conf.border} ${conf.text}`}
              >
                <Icon size={8} />
                {conf.label}
              </span>
              {theme.stockCount > 0 && (
                <span
                  className={`text-xs font-mono font-bold tabular-nums ${
                    theme.avgReturn1M > 0 ? "text-terminal-green" :
                    theme.avgReturn1M < 0 ? "text-terminal-red" :
                    "text-terminal-dim"
                  }`}
                >
                  {fmt(theme.avgReturn1M)} <span className="text-[8px] text-terminal-muted font-normal">1M avg</span>
                </span>
              )}
            </div>

            {/* Driver pill */}
            {theme.driver && theme.driver !== "—" && (
              <p className="mt-1 text-[10px] text-terminal-dim flex items-start gap-1">
                <Zap size={9} className="shrink-0 mt-0.5 text-terminal-yellow" />
                {theme.driver}
              </p>
            )}

            {/* Breadth bar */}
            {theme.stockCount > 0 && (
              <div className="mt-1.5">
                <BreadthBar breadth={theme.breadth} count={theme.stockCount} />
              </div>
            )}
          </div>
        </div>
      </button>

      {/* ── Stock chips ── */}
      {theme.topPerformers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {theme.topPerformers.map((s) => (
            <button
              key={s.symbol}
              onClick={() => onSelect(s.symbol, s.name)}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-terminal-header border border-terminal-border/50 hover:border-terminal-border transition-colors"
            >
              <span className="text-[9px] font-medium text-terminal-dim tracking-wider">
                {s.name}
              </span>
              <span
                className={`text-[9px] font-mono tabular-nums font-semibold ${
                  s.return1M > 0 ? "text-terminal-green" :
                  s.return1M < 0 ? "text-terminal-red"   :
                  "text-terminal-dim"
                }`}
              >
                {fmt(s.return1M)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-terminal-border/30 px-3 py-2.5 space-y-2">
          {/* Full name */}
          <p className="text-[9px] text-terminal-muted tracking-wider uppercase">{theme.name}</p>

          {/* AI analysis */}
          {theme.analysis && theme.analysis !== "Theme analysis unavailable." && (
            <p className="text-[11px] text-terminal-muted leading-relaxed">{theme.analysis}</p>
          )}

          {/* Trade idea */}
          {theme.tradingAngle && theme.tradingAngle !== "—" && (
            <div className="flex items-start gap-2 bg-terminal-blue/5 border border-terminal-blue/20 rounded px-2 py-1.5">
              <span className="text-[9px] text-terminal-blue font-bold tracking-widest shrink-0 mt-0.5">
                TRADE
              </span>
              <span className="text-[11px] text-terminal-dim">{theme.tradingAngle}</span>
            </div>
          )}

          {/* Key news */}
          {theme.keyNews.length > 0 && (
            <div className="space-y-1">
              {theme.keyNews.map((h, i) => (
                <p
                  key={i}
                  className="text-[10px] text-terminal-muted pl-2 border-l border-terminal-border/50 leading-snug"
                >
                  {h}
                </p>
              ))}
            </div>
          )}

          {theme.stockCount === 0 && (
            <p className="text-[9px] text-terminal-muted/60 tracking-wider">
              ⚠ No price data — news-based ranking only (requires Zerodha login)
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ThemeScreener({ onSelectStock }: { onSelectStock: StockSelectHandler }) {
  const [filter, setFilter] = useState<MomentumFilter>("ALL");

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<ThemeAnalysis[]>({
    queryKey: ["market-themes"],
    queryFn: () => axios.get("/api/themes").then((r) => r.data),
    refetchInterval: 30 * 60_000,
    staleTime: 20 * 60_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "ALL") return data;
    return data.filter((t) => t.momentum === filter);
  }, [data, filter]);

  const counts = useMemo(() => {
    if (!data) return { STRONG: 0, MODERATE: 0, WEAK: 0, NEGATIVE: 0 };
    return {
      STRONG:   data.filter((t) => t.momentum === "STRONG").length,
      MODERATE: data.filter((t) => t.momentum === "MODERATE").length,
      WEAK:     data.filter((t) => t.momentum === "WEAK").length,
      NEGATIVE: data.filter((t) => t.momentum === "NEGATIVE").length,
    };
  }, [data]);

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
      })
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* ── Sub-header with counts ── */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-terminal-border/40 shrink-0">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {(["ALL", "STRONG", "MODERATE", "WEAK", "NEGATIVE"] as MomentumFilter[]).map((f) => {
            const count = f === "ALL" ? (data?.length ?? 0) : counts[f];
            const conf  = f === "ALL" ? null : MOMENTUM_CONFIG[f];
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 text-[9px] tracking-widest rounded border whitespace-nowrap transition-colors ${
                  filter === f
                    ? conf
                      ? `${conf.border} ${conf.text} ${conf.bg}`
                      : "border-terminal-blue text-terminal-blue bg-terminal-blue/10"
                    : "border-terminal-border/40 text-terminal-muted hover:text-terminal-dim"
                }`}
              >
                {f} {count > 0 && <span className="opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {updatedAt && (
            <span className="text-[9px] text-terminal-muted hidden sm:inline">{updatedAt}</span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-terminal-dim hover:text-terminal-text transition-colors"
            title="Refresh themes"
          >
            <RefreshCw size={10} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-terminal-dim">
          <RefreshCw size={14} className="animate-spin" />
          <span className="text-xs tracking-widest">SCANNING THEMES...</span>
          <span className="text-[10px] text-terminal-muted">resolving instruments + fetching 1-month history</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-terminal-muted">
          <AlertCircle size={14} />
          <span className="text-xs tracking-widest">NO THEMES MATCH FILTER</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {filtered.map((theme, i) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              rank={data ? data.indexOf(theme) + 1 : i + 1}
              onSelect={onSelectStock}
            />
          ))}
        </div>
      )}
    </div>
  );
}

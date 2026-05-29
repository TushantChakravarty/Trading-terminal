import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Zap, AlertCircle, Layers } from "lucide-react";
import type { SectorAnalysis } from "../../types";
import { ThemeScreener } from "./ThemeScreener";

// ── Config ────────────────────────────────────────────────────────────────────

type DirectionFilter = "ALL" | "BULLISH" | "BEARISH" | "NEUTRAL";

const DIRECTION_CONFIG = {
  BULLISH: {
    label: "BULLISH",
    icon: TrendingUp,
    text: "text-terminal-green",
    bg: "bg-terminal-green/10",
    border: "border-terminal-green/30",
    leftBorder: "border-l-terminal-green",
    dot: "bg-terminal-green",
  },
  BEARISH: {
    label: "BEARISH",
    icon: TrendingDown,
    text: "text-terminal-red",
    bg: "bg-terminal-red/10",
    border: "border-terminal-red/30",
    leftBorder: "border-l-terminal-red",
    dot: "bg-terminal-red",
  },
  NEUTRAL: {
    label: "NEUTRAL",
    icon: Minus,
    text: "text-terminal-dim",
    bg: "bg-terminal-header",
    border: "border-terminal-border",
    leftBorder: "border-l-terminal-border",
    dot: "bg-terminal-dim",
  },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function ActivityBar({ score, max }: { score: number; max: number }) {
  const pct = max > 0 ? Math.min((score / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-terminal-border/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-terminal-blue/70 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] text-terminal-muted tabular-nums w-6 text-right">
        {score.toFixed(1)}
      </span>
    </div>
  );
}

// ── Sector Card ───────────────────────────────────────────────────────────────

function SectorCard({
  sector,
  maxScore,
  rank,
}: {
  sector: SectorAnalysis;
  maxScore: number;
  rank: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const conf = DIRECTION_CONFIG[sector.direction];
  const Icon = conf.icon;

  return (
    <div
      className={`border-l-2 ${conf.leftBorder} border border-terminal-border/40 rounded-sm bg-terminal-panel hover:bg-terminal-header/40 transition-colors`}
    >
      {/* ── Header row ── */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left px-3 pt-2.5 pb-2"
      >
        <div className="flex items-start gap-2">
          {/* Rank */}
          <span className="text-[9px] text-terminal-muted mt-0.5 w-4 shrink-0">
            #{rank}
          </span>

          {/* Name + direction */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-terminal-text tracking-wide">
                {sector.shortName}
              </span>
              <span
                className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold tracking-widest rounded border ${conf.bg} ${conf.border} ${conf.text}`}
              >
                <Icon size={8} />
                {conf.label}
              </span>
              <span
                className={`text-xs font-mono font-bold tabular-nums ${
                  sector.avgChangePct > 0
                    ? "text-terminal-green"
                    : sector.avgChangePct < 0
                    ? "text-terminal-red"
                    : "text-terminal-dim"
                }`}
              >
                {sector.priceDataAvailable ? fmt(sector.avgChangePct) : "—"}
              </span>
              {sector.priceDataAvailable && (
                <span className={`px-1 py-0.5 text-[8px] tracking-widest rounded border font-medium ${
                  sector.dataWindow === "2W"
                    ? "text-terminal-blue border-terminal-blue/30 bg-terminal-blue/10"
                    : "text-terminal-dim border-terminal-border/40 bg-terminal-header"
                }`}>
                  {sector.dataWindow}
                </span>
              )}
            </div>

            {/* Activity bar */}
            <div className="mt-1.5">
              <ActivityBar score={sector.activityScore} max={maxScore} />
            </div>

            {/* Catalyst */}
            {sector.catalyst && sector.catalyst !== "—" && (
              <p className="mt-1.5 text-[10px] text-terminal-dim leading-snug flex items-start gap-1">
                <Zap size={9} className="shrink-0 mt-0.5 text-terminal-yellow" />
                {sector.catalyst}
              </p>
            )}
          </div>
        </div>
      </button>

      {/* ── Top movers chips ── */}
      <div className="flex flex-wrap gap-1.5 px-3 pb-2">
        {sector.topMovers
          .filter((m) => m.ltp > 0 || !sector.priceDataAvailable)
          .map((m) => (
            <div
              key={m.symbol}
              className="flex items-center gap-1 px-2 py-1 rounded bg-terminal-header border border-terminal-border/50"
            >
              <span className="text-[9px] font-medium text-terminal-dim tracking-wider">
                {m.name}
              </span>
              {sector.priceDataAvailable && (
                <span
                  className={`text-[9px] font-mono tabular-nums ${
                    m.changePct > 0
                      ? "text-terminal-green"
                      : m.changePct < 0
                      ? "text-terminal-red"
                      : "text-terminal-dim"
                  }`}
                >
                  {fmt(m.changePct)}
                </span>
              )}
            </div>
          ))}
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="border-t border-terminal-border/30 px-3 py-2.5 space-y-2">
          {/* AI analysis */}
          {sector.analysis && (
            <p className="text-[11px] text-terminal-muted leading-relaxed">
              {sector.analysis}
            </p>
          )}

          {/* Trading angle */}
          {sector.tradingAngle && sector.tradingAngle !== "—" && (
            <div className="flex items-start gap-2 bg-terminal-blue/5 border border-terminal-blue/20 rounded px-2 py-1.5">
              <span className="text-[9px] text-terminal-blue font-bold tracking-widest shrink-0 mt-0.5">
                TRADE
              </span>
              <span className="text-[11px] text-terminal-dim">{sector.tradingAngle}</span>
            </div>
          )}

          {/* Key news */}
          {sector.keyNews.length > 0 && (
            <div className="space-y-1">
              {sector.keyNews.map((headline, i) => (
                <p
                  key={i}
                  className="text-[10px] text-terminal-muted pl-2 border-l border-terminal-border/50 leading-snug"
                >
                  {headline}
                </p>
              ))}
            </div>
          )}

          {/* No price data notice */}
          {!sector.priceDataAvailable && (
            <p className="text-[9px] text-terminal-muted/60 tracking-wider">
              ⚠ LIVE PRICES UNAVAILABLE — showing news-based ranking only
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Broad sectors view (inner) ────────────────────────────────────────────────

function BroadSectors() {
  const [dirFilter, setDirFilter] = useState<DirectionFilter>("ALL");

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<SectorAnalysis[]>({
    queryKey: ["hot-sectors"],
    queryFn: () => axios.get("/api/sectors").then((r) => r.data),
    refetchInterval: 15 * 60_000,
    staleTime: 10 * 60_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (dirFilter === "ALL") return data;
    return data.filter((s) => s.direction === dirFilter);
  }, [data, dirFilter]);

  const maxScore = useMemo(
    () => (data ? Math.max(...data.map((s) => s.activityScore), 1) : 1),
    [data]
  );

  const bullCount    = data?.filter((s) => s.direction === "BULLISH").length ?? 0;
  const bearCount    = data?.filter((s) => s.direction === "BEARISH").length ?? 0;
  const neutralCount = data?.filter((s) => s.direction === "NEUTRAL").length ?? 0;

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : null;

  return (
    <div className="flex flex-col h-full bg-terminal-panel font-mono">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-terminal-border shrink-0">
        <Zap size={11} className="text-terminal-yellow shrink-0" />
        <span className="text-terminal-dim text-xs tracking-widest">HOT SECTORS</span>

        {/* Quick stats */}
        {data && (
          <div className="flex items-center gap-2">
            {bullCount > 0 && (
              <span className="text-[9px] text-terminal-green font-bold">
                ▲{bullCount}
              </span>
            )}
            {bearCount > 0 && (
              <span className="text-[9px] text-terminal-red font-bold">
                ▼{bearCount}
              </span>
            )}
            {neutralCount > 0 && (
              <span className="text-[9px] text-terminal-dim">
                ={neutralCount}
              </span>
            )}
          </div>
        )}

        <div className="flex-1" />
        {updatedAt && (
          <span className="text-[9px] text-terminal-muted hidden sm:inline">{updatedAt}</span>
        )}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-terminal-dim hover:text-terminal-text transition-colors"
          title="Refresh"
        >
          <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex gap-1.5 px-4 py-2 border-b border-terminal-border shrink-0 overflow-x-auto">
        {(["ALL", "BULLISH", "BEARISH", "NEUTRAL"] as DirectionFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setDirFilter(f)}
            className={`px-2.5 py-1 text-[9px] tracking-widest rounded border whitespace-nowrap transition-colors ${
              dirFilter === f
                ? f === "BULLISH"
                  ? "border-terminal-green text-terminal-green bg-terminal-green/10"
                  : f === "BEARISH"
                  ? "border-terminal-red text-terminal-red bg-terminal-red/10"
                  : "border-terminal-blue text-terminal-blue bg-terminal-blue/10"
                : "border-terminal-border/50 text-terminal-dim hover:text-terminal-text hover:border-terminal-border"
            }`}
          >
            {f}
          </button>
        ))}

        <div className="flex-1" />
        <span className="text-[9px] text-terminal-muted self-center px-1 hidden sm:inline">
          click card to expand
        </span>
      </div>

      {/* ── Subheader note ── */}
      {data && !data[0]?.priceDataAvailable && (
        <div className="px-4 py-1.5 bg-terminal-yellow/5 border-b border-terminal-yellow/20 shrink-0">
          <span className="text-[9px] text-terminal-yellow tracking-wider">
            ⚡ News-based ranking — 2-week price data available after Zerodha login
          </span>
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-terminal-dim">
          <RefreshCw size={14} className="animate-spin" />
          <span className="text-xs tracking-widest">ANALYZING SECTORS...</span>
          <span className="text-[10px] text-terminal-muted">fetching quotes + running AI analysis</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-terminal-muted">
          <AlertCircle size={14} />
          <span className="text-xs tracking-widest">NO SECTORS MATCH FILTER</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {filtered.map((sector, i) => (
            <SectorCard
              key={sector.id}
              sector={sector}
              maxScore={maxScore}
              rank={data ? data.indexOf(sector) + 1 : i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Top-level export with SECTORS / THEMES toggle ────────────────────────────

type ViewMode = "SECTORS" | "THEMES";

export function HotSectors() {
  const [view, setView] = useState<ViewMode>("SECTORS");

  return (
    <div className="flex flex-col h-full bg-terminal-panel font-mono">
      {/* ── View toggle header ── */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-terminal-border shrink-0">
        <Layers size={11} className="text-terminal-dim shrink-0 mr-1" />
        {(["SECTORS", "THEMES"] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 text-[10px] tracking-widest rounded border transition-colors ${
              view === v
                ? "border-terminal-blue text-terminal-blue bg-terminal-blue/10"
                : "border-terminal-border/40 text-terminal-dim hover:text-terminal-text"
            }`}
          >
            {v}
          </button>
        ))}
        {view === "THEMES" && (
          <span className="ml-2 text-[9px] text-terminal-muted hidden sm:inline">
            1-month thematic momentum · click to expand
          </span>
        )}
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === "SECTORS" ? <BroadSectors /> : <ThemeScreener />}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle, LogIn } from "lucide-react";
import { useTerminalStore } from "../../store";

const UNDERLYINGS = ["NIFTY", "BANKNIFTY", "FINNIFTY"];

// ── Types ─────────────────────────────────────────────────────────────────────

interface SignalResult {
  underlying: string;
  spot: number;
  direction: "BULLISH" | "BEARISH" | "NEUTRAL";
  confidence: number;
  generatedAt: string;
  options: {
    pcr: number;
    pcrSignal: string;
    maxPain: number;
    atmStrike: number;
    totalCallOI: number;
    totalPutOI: number;
    topCallWalls: { strike: number; oi: number }[];
    topPutWalls:  { strike: number; oi: number }[];
  };
  news: {
    sentiment: string;
    score: number;
    highImpact: { title: string; source: string; category: string }[];
  };
  suggestion: {
    action: string;
    strike: number;
    expiry: string;
    reason: string[];
  };
}

// ── Config ────────────────────────────────────────────────────────────────────

const DIRECTION_CONFIG = {
  BULLISH: {
    icon:       TrendingUp,
    color:      "text-terminal-green",
    bg:         "bg-terminal-green/10",
    border:     "border-terminal-green/30",
    barColor:   "bg-terminal-green",
    glowBorder: "border-l-4 border-l-terminal-green",
  },
  BEARISH: {
    icon:       TrendingDown,
    color:      "text-terminal-red",
    bg:         "bg-terminal-red/10",
    border:     "border-terminal-red/30",
    barColor:   "bg-terminal-red",
    glowBorder: "border-l-4 border-l-terminal-red",
  },
  NEUTRAL: {
    icon:       Minus,
    color:      "text-terminal-yellow",
    bg:         "bg-terminal-yellow/10",
    border:     "border-terminal-yellow/30",
    barColor:   "bg-terminal-yellow",
    glowBorder: "border-l-4 border-l-terminal-yellow",
  },
};

function fmtOI(n: number) {
  if (!n) return "—";
  if (n >= 1_00_00_000) return (n / 1_00_00_000).toFixed(1) + "Cr";
  if (n >= 1_00_000)    return (n / 1_00_000).toFixed(1) + "L";
  if (n >= 1_000)       return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ConfidenceBar({ value, direction }: { value: number; direction: "BULLISH" | "BEARISH" | "NEUTRAL" }) {
  const cfg = DIRECTION_CONFIG[direction];
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-terminal-dim mb-1">
        <span>Confidence</span>
        <span className={cfg.color}>{value}%</span>
      </div>
      <div className="h-1.5 bg-terminal-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${cfg.barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-terminal-border/40">
      <span className="text-terminal-dim text-[11px]">{label}</span>
      <div className="text-right">
        <span className="text-terminal-text text-xs font-medium">{value}</span>
        {sub && <span className="text-terminal-muted text-[10px] ml-1.5">{sub}</span>}
      </div>
    </div>
  );
}

function OIWallBar({
  walls,
  side,
}: {
  walls: { strike: number; oi: number }[];
  side: "call" | "put";
}) {
  const max = Math.max(...walls.map((w) => w.oi), 1);
  const color = side === "call" ? "bg-terminal-green" : "bg-terminal-red";
  const label = side === "call" ? "RESISTANCE (Call OI)" : "SUPPORT (Put OI)";

  return (
    <div>
      <p className="text-[9px] text-terminal-muted tracking-widest mb-1.5">{label}</p>
      {walls.map((w, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="text-[11px] tabular-nums text-terminal-text w-16 text-right shrink-0">
            {w.strike.toLocaleString("en-IN")}
          </span>
          <div className="flex-1 h-1.5 bg-terminal-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${color} opacity-70`}
              style={{ width: `${(w.oi / max) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-terminal-muted w-10 shrink-0">{fmtOI(w.oi)}</span>
        </div>
      ))}
    </div>
  );
}

function SuggestionBox({ suggestion, direction }: { suggestion: SignalResult["suggestion"]; direction: "BULLISH" | "BEARISH" | "NEUTRAL" }) {
  const cfg = DIRECTION_CONFIG[direction];
  const isWait = suggestion.action.toLowerCase().startsWith("wait");

  return (
    <div className={`rounded border ${cfg.border} ${cfg.bg} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] text-terminal-muted tracking-widest">SUGGESTED TRADE</span>
        {isWait && <AlertTriangle size={10} className="text-terminal-yellow" />}
      </div>

      <div className={`text-base font-bold mb-1 ${cfg.color}`}>
        {suggestion.action}
      </div>

      {!isWait && (
        <div className="flex gap-3 text-xs text-terminal-dim mb-2">
          <span>Strike <span className="text-terminal-text font-medium">{suggestion.strike.toLocaleString("en-IN")}</span></span>
          <span>·</span>
          <span>Expiry <span className="text-terminal-text font-medium">{suggestion.expiry}</span></span>
        </div>
      )}

      <div className="space-y-1">
        {suggestion.reason.map((r, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[10px] text-terminal-dim">
            <span className={`mt-0.5 shrink-0 ${cfg.color}`}>›</span>
            <span>{r}</span>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-terminal-muted mt-3 italic">
        Not financial advice. Verify before trading.
      </p>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function SignalPanel() {
  const [underlying, setUnderlying] = useState("NIFTY");
  const isAuthenticated = useTerminalStore((s) => s.isAuthenticated);

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } =
    useQuery<SignalResult, AxiosError<{ error: string }>>({
      queryKey: ["signal", underlying],
      queryFn: () => axios.get(`/api/signals/${underlying}`).then((r) => r.data),
      enabled: isAuthenticated,
      staleTime: 60_000,
      refetchInterval: 90_000,
      retry: 1,
    });

  const cfg = data ? DIRECTION_CONFIG[data.direction] : DIRECTION_CONFIG.NEUTRAL;
  const Icon = cfg.icon;

  return (
    <div className="flex flex-col h-full bg-terminal-panel overflow-y-auto">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-terminal-border shrink-0">
        <span className="text-terminal-dim text-xs tracking-widest font-medium">TRADE SIGNAL</span>
        <div className="flex gap-1 ml-2">
          {UNDERLYINGS.map((u) => (
            <button
              key={u}
              onClick={() => setUnderlying(u)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                underlying === u ? "bg-terminal-blue text-white" : "text-terminal-dim hover:text-terminal-text"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
        {dataUpdatedAt && (
          <span className="text-terminal-muted text-[10px] ml-auto">
            {timeAgo(new Date(dataUpdatedAt).toISOString())}
          </span>
        )}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-terminal-dim hover:text-terminal-blue transition-colors disabled:opacity-40 ml-1"
        >
          <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {!isAuthenticated && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
          <span className="text-terminal-dim text-sm">Signal unavailable</span>
          <span className="text-terminal-muted text-xs text-center">Login with Zerodha to enable signal computation</span>
        </div>
      )}

      {isAuthenticated && isLoading && (
        <div className="flex-1 flex items-center justify-center text-terminal-dim text-sm">
          Computing signal...
        </div>
      )}

      {isAuthenticated && error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
          <span className="text-terminal-red text-sm">Signal computation failed</span>
          <span className="text-terminal-muted text-xs text-center">
            {error.response?.data?.error ?? error.message}
          </span>
          {error.response?.status === 401 ? (
            <a
              href="/api/auth/login"
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-terminal-blue text-white text-xs rounded hover:opacity-80 transition-opacity"
            >
              <LogIn size={11} /> Re-login with Zerodha
            </a>
          ) : (
            <button
              onClick={() => refetch()}
              className="mt-2 text-[10px] text-terminal-blue hover:opacity-80 flex items-center gap-1"
            >
              <RefreshCw size={10} /> Retry
            </button>
          )}
        </div>
      )}

      {data && !isLoading && (
        <div className="p-4 space-y-4">

          {/* ── Direction card ── */}
          <div className={`rounded border ${cfg.border} ${cfg.bg} ${cfg.glowBorder} p-4`}>
            <div className="flex items-center gap-3 mb-3">
              <Icon size={28} className={cfg.color} strokeWidth={2.5} />
              <div>
                <div className={`text-2xl font-bold ${cfg.color}`}>{data.direction}</div>
                <div className="text-terminal-dim text-xs">{data.underlying} · Spot {data.spot.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</div>
              </div>
            </div>
            <ConfidenceBar value={data.confidence} direction={data.direction} />
          </div>

          {/* ── Options stats ── */}
          <div>
            <p className="text-[9px] text-terminal-muted tracking-widest mb-2">OPTIONS ANALYSIS</p>
            <StatRow
              label="PCR (Put/Call Ratio)"
              value={data.options.pcr.toFixed(2)}
              sub={data.options.pcr > 1.2 ? "→ Bullish" : data.options.pcr < 0.8 ? "→ Bearish" : "→ Neutral"}
            />
            <StatRow
              label="Max Pain"
              value={data.options.maxPain.toLocaleString("en-IN")}
              sub={data.spot > data.options.maxPain ? "(spot above)" : "(spot below)"}
            />
            <StatRow label="Total Call OI" value={fmtOI(data.options.totalCallOI)} />
            <StatRow label="Total Put OI"  value={fmtOI(data.options.totalPutOI)} />
          </div>

          {/* ── OI walls ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <OIWallBar walls={data.options.topCallWalls} side="call" />
            <OIWallBar walls={data.options.topPutWalls}  side="put"  />
          </div>

          {/* ── News sentiment ── */}
          <div>
            <p className="text-[9px] text-terminal-muted tracking-widest mb-2">NEWS SENTIMENT</p>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-sm font-semibold ${
                data.news.sentiment === "BULLISH" ? "text-terminal-green"
                : data.news.sentiment === "BEARISH" ? "text-terminal-red"
                : "text-terminal-yellow"
              }`}>
                {data.news.sentiment}
              </span>
              <span className="text-terminal-muted text-[10px]">
                (score {data.news.score > 0 ? "+" : ""}{data.news.score.toFixed(1)})
              </span>
            </div>
            {data.news.highImpact.length > 0 && (
              <div className="space-y-1.5">
                {data.news.highImpact.map((n, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-terminal-red text-[9px] mt-0.5 shrink-0">●</span>
                    <p className="text-[10px] text-terminal-dim leading-snug line-clamp-2">{n.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Suggestion ── */}
          <SuggestionBox suggestion={data.suggestion} direction={data.direction} />
        </div>
      )}
    </div>
  );
}

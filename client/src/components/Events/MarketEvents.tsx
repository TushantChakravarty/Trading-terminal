import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { RefreshCw, Calendar, AlertCircle } from "lucide-react";
import type { MarketEvent, EventType, ImpactLevel } from "../../types";

// ── Config ────────────────────────────────────────────────────────────────────

const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; color: string; bg: string }
> = {
  INDEX_REBALANCE: { label: "INDEX REJIG",  color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/30" },
  FO_EXPIRY:       { label: "F&O EXPIRY",   color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/30" },
  RBI_POLICY:      { label: "RBI POLICY",   color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/30"     },
  ECONOMIC_DATA:   { label: "MACRO DATA",   color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/30"     },
  GLOBAL:          { label: "GLOBAL",       color: "text-slate-300",   bg: "bg-slate-500/10 border-slate-500/30"   },
  IPO:             { label: "IPO",          color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/30"     },
  CORPORATE:       { label: "CORPORATE",    color: "text-green-400",   bg: "bg-green-500/10 border-green-500/30"   },
  HOLIDAY:         { label: "HOLIDAY",      color: "text-gray-400",    bg: "bg-gray-500/10 border-gray-500/30"     },
};

const IMPACT_CONFIG: Record<ImpactLevel, { label: string; dot: string; border: string }> = {
  HIGH:   { label: "HIGH",   dot: "bg-terminal-red",    border: "border-l-terminal-red"    },
  MEDIUM: { label: "MED",    dot: "bg-terminal-yellow", border: "border-l-terminal-yellow" },
  LOW:    { label: "LOW",    dot: "bg-terminal-blue",   border: "border-l-terminal-blue"   },
};

const FILTER_TABS: { id: EventType | "ALL"; label: string }[] = [
  { id: "ALL",              label: "ALL" },
  { id: "INDEX_REBALANCE",  label: "REJIG" },
  { id: "FO_EXPIRY",        label: "F&O" },
  { id: "RBI_POLICY",       label: "RBI" },
  { id: "ECONOMIC_DATA",    label: "MACRO" },
  { id: "GLOBAL",           label: "GLOBAL" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function daysUntil(dateStr: string): number {
  const today = todayIST();
  const diff =
    new Date(dateStr).getTime() - new Date(today).getTime();
  return Math.round(diff / 86_400_000);
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function CountdownBadge({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr);
  if (days === 0)
    return (
      <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-widest rounded bg-terminal-red/20 text-terminal-red border border-terminal-red/40 animate-pulse">
        TODAY
      </span>
    );
  if (days === 1)
    return (
      <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-widest rounded bg-terminal-yellow/20 text-terminal-yellow border border-terminal-yellow/40">
        TOMORROW
      </span>
    );
  if (days > 0 && days <= 7)
    return (
      <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-widest rounded bg-terminal-blue/20 text-terminal-blue border border-terminal-blue/40">
        {days}D
      </span>
    );
  if (days > 7)
    return (
      <span className="px-1.5 py-0.5 text-[9px] tracking-widest rounded bg-terminal-header text-terminal-dim border border-terminal-border">
        {days}D
      </span>
    );
  // Past event
  return (
    <span className="px-1.5 py-0.5 text-[9px] tracking-widest rounded bg-terminal-header text-terminal-muted border border-terminal-border">
      PAST
    </span>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EventCard({ event }: { event: MarketEvent }) {
  const [expanded, setExpanded] = useState(false);
  const typeConf   = EVENT_TYPE_CONFIG[event.type];
  const impactConf = IMPACT_CONFIG[event.impact];
  const days       = daysUntil(event.date);
  const isToday    = days === 0;
  const isPast     = days < 0;

  return (
    <button
      onClick={() => setExpanded((p) => !p)}
      className={`w-full text-left border-l-2 ${impactConf.border} ${
        isToday
          ? "bg-terminal-red/5 border border-terminal-red/20 rounded-sm"
          : "border border-terminal-border/40 rounded-sm hover:bg-terminal-header/60"
      } ${isPast ? "opacity-50" : ""} transition-colors`}
    >
      {/* Top row */}
      <div className="flex items-start gap-3 px-3 pt-2.5 pb-2">
        {/* Date column */}
        <div className="shrink-0 text-right w-16">
          <div className="text-[10px] text-terminal-dim leading-tight">
            {formatEventDate(event.date)}
          </div>
          <div className="mt-0.5">
            <CountdownBadge dateStr={event.date} />
          </div>
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span
              className={`px-1.5 py-0.5 text-[9px] font-medium tracking-widest rounded border ${typeConf.bg} ${typeConf.color}`}
            >
              {typeConf.label}
            </span>
            <span
              className={`px-1.5 py-0.5 text-[9px] font-bold tracking-widest rounded ${
                event.impact === "HIGH"
                  ? "bg-terminal-red/15 text-terminal-red border border-terminal-red/30"
                  : event.impact === "MEDIUM"
                  ? "bg-terminal-yellow/15 text-terminal-yellow border border-terminal-yellow/30"
                  : "bg-terminal-blue/15 text-terminal-blue border border-terminal-blue/30"
              }`}
            >
              {impactConf.label}
            </span>
          </div>

          {/* Title */}
          <p
            className={`text-xs font-medium leading-snug ${
              isToday ? "text-terminal-text" : "text-terminal-dim"
            }`}
          >
            {event.title}
          </p>

          {/* Expanded description */}
          {expanded && (
            <p className="mt-1.5 text-[11px] text-terminal-muted leading-relaxed">
              {event.description}
            </p>
          )}

          {/* Affected symbols */}
          {(expanded || isToday) && event.affectedSymbols && event.affectedSymbols.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {event.affectedSymbols.map((s) => (
                <span
                  key={s}
                  className="px-1.5 py-0.5 text-[9px] rounded bg-terminal-header border border-terminal-border text-terminal-dim tracking-wider"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Source */}
          {expanded && event.source && (
            <p className="mt-1.5 text-[9px] text-terminal-muted tracking-wider">
              SOURCE: {event.source}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <span className="text-[9px] tracking-[0.15em] text-terminal-muted font-medium">
        {label}
      </span>
      <span className="text-[9px] text-terminal-muted/60">({count})</span>
      <div className="flex-1 border-t border-terminal-border/40" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MarketEvents() {
  const [activeType, setActiveType] = useState<EventType | "ALL">("ALL");

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<MarketEvent[]>({
    queryKey: ["market-events"],
    queryFn: () => axios.get("/api/events").then((r) => r.data),
    refetchInterval: 60 * 60_000, // 1 hour — nearly static data
    staleTime: 30 * 60_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (activeType === "ALL") return data;
    return data.filter((e) => e.type === activeType);
  }, [data, activeType]);

  const todayEvents    = useMemo(() => filtered.filter((e) => daysUntil(e.date) === 0), [filtered]);
  const upcomingEvents = useMemo(() => filtered.filter((e) => daysUntil(e.date) > 0), [filtered]);
  const pastEvents     = useMemo(
    () => filtered.filter((e) => daysUntil(e.date) < 0).slice(-3),
    [filtered]
  );

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
        <Calendar size={11} className="text-terminal-dim shrink-0" />
        <span className="text-terminal-dim text-xs tracking-widest">MARKET EVENTS</span>
        {todayEvents.length > 0 && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-terminal-red/20 text-terminal-red border border-terminal-red/30 animate-pulse">
            {todayEvents.length} TODAY
          </span>
        )}
        <div className="flex-1" />
        {updatedAt && (
          <span className="text-[9px] text-terminal-muted hidden sm:inline">
            {updatedAt}
          </span>
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

      {/* ── Filter Bar ── */}
      <div className="flex gap-1.5 px-4 py-2 border-b border-terminal-border shrink-0 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveType(tab.id)}
            className={`px-2.5 py-1 text-[9px] tracking-widest rounded border whitespace-nowrap transition-colors ${
              activeType === tab.id
                ? "border-terminal-blue text-terminal-blue bg-terminal-blue/10"
                : "border-terminal-border/50 text-terminal-dim hover:text-terminal-text hover:border-terminal-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-terminal-dim">
          <RefreshCw size={14} className="animate-spin" />
          <span className="text-xs tracking-widest">LOADING EVENTS...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-terminal-muted">
          <AlertCircle size={14} />
          <span className="text-xs tracking-widest">NO EVENTS FOUND</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Today */}
          {todayEvents.length > 0 && (
            <div className="px-3 py-2 space-y-1.5">
              <SectionHeader label="TODAY" count={todayEvents.length} />
              {todayEvents.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}

          {/* Upcoming */}
          {upcomingEvents.length > 0 && (
            <div className="px-3 py-2 space-y-1.5">
              <SectionHeader label="UPCOMING" count={upcomingEvents.length} />
              {upcomingEvents.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}

          {/* Recent Past */}
          {pastEvents.length > 0 && (
            <div className="px-3 py-2 space-y-1.5">
              <SectionHeader label="RECENT" count={pastEvents.length} />
              {[...pastEvents].reverse().map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

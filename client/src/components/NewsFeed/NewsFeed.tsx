import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ExternalLink, RefreshCw } from "lucide-react";
import { NewsItem, NewsCategory, ImpactLevel } from "../../types";

// ── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES: { id: NewsCategory | "ALL"; label: string }[] = [
  { id: "ALL",       label: "All"       },
  { id: "WAR",       label: "⚔ War"    },
  { id: "OIL",       label: "🛢 Oil"   },
  { id: "HEALTH",    label: "🦠 Health" },
  { id: "GLOBAL",    label: "Global"    },
  { id: "RBI",       label: "RBI"       },
  { id: "MACRO",     label: "Macro"     },
  { id: "MARKETS",   label: "Markets"   },
  { id: "CORPORATE", label: "Corporate" },
  { id: "SECTOR",    label: "Sector"    },
  { id: "BUDGET",    label: "Budget"    },
];

const CATEGORY_COLORS: Record<NewsCategory, string> = {
  WAR:       "bg-red-900/40 text-red-300 border-red-700/50",
  OIL:       "bg-amber-900/30 text-amber-300 border-amber-700/40",
  HEALTH:    "bg-emerald-900/30 text-emerald-300 border-emerald-700/40",
  RBI:       "bg-blue-500/20 text-blue-300 border-blue-500/40",
  MACRO:     "bg-purple-500/20 text-purple-300 border-purple-500/40",
  GLOBAL:    "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  CORPORATE: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  BUDGET:    "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  MARKETS:   "bg-green-500/20 text-green-300 border-green-500/40",
  SECTOR:    "bg-pink-500/20 text-pink-300 border-pink-500/40",
  GENERAL:   "bg-terminal-border text-terminal-dim border-terminal-border",
};

const IMPACT_CONFIG: Record<ImpactLevel, { label: string; cls: string; dot: string }> = {
  HIGH:   { label: "HIGH",  cls: "text-terminal-red",    dot: "bg-terminal-red animate-pulse" },
  MEDIUM: { label: "MED",   cls: "text-terminal-yellow", dot: "bg-terminal-yellow" },
  LOW:    { label: "LOW",   cls: "text-terminal-muted",  dot: "bg-terminal-muted" },
};

const SOURCE_COLORS: Record<string, string> = {
  // Indian RSS
  "ET Markets":        "text-orange-400",
  "ET Economy":        "text-orange-300",
  Moneycontrol:        "text-blue-400",
  LiveMint:            "text-purple-400",
  "LiveMint Economy":  "text-purple-300",
  "Business Standard": "text-yellow-400",
  "BS Economy":        "text-yellow-300",
  "Financial Express": "text-green-400",
  "CNBC TV18":         "text-cyan-400",
  "Reuters India":     "text-red-400",
  // NewsAPI global sources
  Reuters:             "text-red-400",
  "BBC News":          "text-blue-400",
  Bloomberg:           "text-terminal-blue",
  "The Guardian":      "text-cyan-400",
  "Associated Press":  "text-orange-400",
  "Financial Times":   "text-yellow-400",
  "Al Jazeera English":"text-amber-400",
  "CNN":               "text-red-300",
  "The New York Times":"text-gray-300",
  "CNBC":              "text-cyan-300",
  "Axios":             "text-purple-300",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(pubDate: string) {
  const diff = Date.now() - new Date(pubDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ImpactBadge({ level }: { level: ImpactLevel }) {
  const c = IMPACT_CONFIG[level];
  return (
    <span className={`flex items-center gap-1 text-[9px] font-bold tracking-widest ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}

function CategoryTag({ cat }: { cat: NewsCategory }) {
  return (
    <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded border ${CATEGORY_COLORS[cat]}`}>
      {cat}
    </span>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const isHigh = item.impact === "HIGH";
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`block px-4 py-3 border-b border-terminal-border/50 hover:bg-terminal-header transition-colors group ${
        isHigh ? "border-l-2 border-l-terminal-red" : ""
      }`}
    >
      {/* Top row: impact + category + source + time */}
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <ImpactBadge level={item.impact} />
        <CategoryTag cat={item.category} />
        <span className={`text-[10px] font-medium ${SOURCE_COLORS[item.source] ?? "text-terminal-dim"}`}>
          {item.source}
        </span>
        <span className="text-terminal-muted text-[10px] ml-auto shrink-0">
          {timeAgo(item.pubDate)}
        </span>
      </div>

      {/* Headline */}
      <div className="flex items-start gap-2">
        <p className={`text-xs leading-snug flex-1 transition-colors ${
          isHigh
            ? "text-white font-medium group-hover:text-terminal-blue"
            : "text-terminal-text group-hover:text-white"
        }`}>
          {item.title}
        </p>
        <ExternalLink
          size={10}
          className="text-terminal-muted shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Snippet */}
      {item.snippet && (
        <p className="text-[10px] text-terminal-muted mt-1 line-clamp-2 leading-relaxed">
          {item.snippet}
        </p>
      )}
    </a>
  );
}

function StatsBar({ items }: { items: NewsItem[] }) {
  const high   = items.filter((i) => i.impact === "HIGH").length;
  const medium = items.filter((i) => i.impact === "MEDIUM").length;
  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-terminal-header border-b border-terminal-border text-[10px]">
      <span className="text-terminal-muted">{items.length} stories</span>
      <span className="text-terminal-muted">·</span>
      <span className="text-terminal-red font-medium">{high} high impact</span>
      <span className="text-terminal-muted">·</span>
      <span className="text-terminal-yellow">{medium} medium</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function NewsFeed() {
  const [activeCategory, setActiveCategory] = useState<NewsCategory | "ALL">("ALL");
  const [impactFilter, setImpactFilter]     = useState<ImpactLevel | "ALL">("ALL");
  const [search, setSearch]                 = useState("");

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery<NewsItem[]>({
    queryKey: ["news"],
    queryFn: () => axios.get("/api/news").then((r) => r.data),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((item) => {
      if (activeCategory !== "ALL" && item.category !== activeCategory) return false;
      if (impactFilter  !== "ALL" && item.impact    !== impactFilter)   return false;
      if (search) {
        const q = search.toLowerCase();
        if (!item.title.toLowerCase().includes(q) && !item.source.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, activeCategory, impactFilter, search]);

  // Sort: HIGH impact first, then by date
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        if (impactOrder[a.impact] !== impactOrder[b.impact])
          return impactOrder[a.impact] - impactOrder[b.impact];
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      }),
    [filtered]
  );

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex flex-col h-full bg-terminal-panel">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-terminal-border shrink-0">
        <span className="text-terminal-dim text-xs tracking-widest font-medium">MARKET NEWS</span>
        {lastUpdated && (
          <span className="text-terminal-muted text-[10px]">Updated {lastUpdated}</span>
        )}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto text-terminal-dim hover:text-terminal-blue transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="px-4 py-2 border-b border-terminal-border shrink-0 space-y-2">
        {/* Category chips */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                activeCategory === c.id
                  ? "bg-terminal-blue text-white"
                  : "text-terminal-dim hover:text-terminal-text"
              }`}
            >
              {c.label}
            </button>
          ))}

          {/* Impact filter */}
          <div className="ml-auto flex gap-1">
            {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setImpactFilter(lvl)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  impactFilter === lvl
                    ? lvl === "HIGH"   ? "bg-terminal-red/30 text-terminal-red border border-terminal-red/50"
                    : lvl === "MEDIUM" ? "bg-terminal-yellow/20 text-terminal-yellow border border-terminal-yellow/40"
                    : lvl === "LOW"    ? "bg-terminal-muted/20 text-terminal-muted border border-terminal-muted/40"
                    : "bg-terminal-blue text-white"
                    : "text-terminal-muted hover:text-terminal-dim"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search headlines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-terminal-bg border border-terminal-border rounded px-2.5 py-1 text-xs text-terminal-text placeholder:text-terminal-muted focus:outline-none focus:border-terminal-blue transition-colors"
        />
      </div>

      {/* ── Stats bar ── */}
      {filtered.length > 0 && <StatsBar items={filtered} />}

      {/* ── Content ── */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-terminal-dim text-sm">
          Fetching news...
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-terminal-muted text-sm">
          No stories match your filters
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {sorted.map((item, i) => (
          <NewsCard key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

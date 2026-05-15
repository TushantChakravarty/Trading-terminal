import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Bot, RefreshCw, TrendingUp, TrendingDown, Minus,
  Star, Zap, AlertTriangle, ChevronDown, ChevronUp,
} from "lucide-react";
import { MarketPulse, StockIdea, OptionsIdea, IndexIdea } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function BiasChip({ bias }: { bias: "BULLISH" | "BEARISH" | "NEUTRAL" | "BUY" | "SELL" | "HOLD" }) {
  const map = {
    BULLISH: "bg-terminal-green/20 text-terminal-green border-terminal-green/40",
    BUY:     "bg-terminal-green/20 text-terminal-green border-terminal-green/40",
    BEARISH: "bg-terminal-red/20 text-terminal-red border-terminal-red/40",
    SELL:    "bg-terminal-red/20 text-terminal-red border-terminal-red/40",
    NEUTRAL: "bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/40",
    HOLD:    "bg-terminal-yellow/20 text-terminal-yellow border-terminal-yellow/40",
  } as const;
  const Icon = (bias === "BULLISH" || bias === "BUY")
    ? TrendingUp : (bias === "BEARISH" || bias === "SELL") ? TrendingDown : Minus;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider ${map[bias]}`}>
      <Icon size={9} />
      {bias}
    </span>
  );
}

// ── Star rating ───────────────────────────────────────────────────────────────

function StarRating({
  suggestionId,
  ideaId,
  value,
  onChange,
}: {
  suggestionId: string;
  ideaId: string;
  value: number;
  onChange: (r: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);

  async function rate(r: number) {
    setSaving(true);
    try {
      await axios.post("/api/ai/rate", { suggestionId, ideaId, rating: r });
      onChange(r);
    } catch {/* ignore */}
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          disabled={saving}
          onClick={() => rate(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-colors disabled:opacity-40"
        >
          <Star
            size={11}
            className={
              n <= (hover || value)
                ? "fill-terminal-yellow text-terminal-yellow"
                : "text-terminal-muted"
            }
          />
        </button>
      ))}
      {value > 0 && (
        <span className="text-[9px] text-terminal-muted ml-1">{value}/5</span>
      )}
    </div>
  );
}

// ── Index idea card ───────────────────────────────────────────────────────────

function IndexCard({
  idea,
  suggestionId,
}: {
  idea: IndexIdea;
  suggestionId: string;
}) {
  const [rating, setRating] = useState(0);
  const isUp = idea.bias === "BUY";
  return (
    <div className={`rounded border bg-terminal-bg/60 p-3 border-l-2 ${isUp ? "border-l-terminal-green border-terminal-border" : "border-l-terminal-red border-terminal-border"}`}>
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-sm font-bold text-terminal-text">{idea.index}</span>
        <span className="text-[9px] text-terminal-muted">{idea.instrument}</span>
        <BiasChip bias={idea.bias} />
        <div className="flex-1" />
        <StarRating suggestionId={suggestionId} ideaId={idea.id} value={rating} onChange={setRating} />
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[10px] mb-1.5">
        <div><span className="text-terminal-muted">Entry</span> <span className="text-terminal-text tabular-nums">{idea.entry}</span></div>
        <div><span className="text-terminal-muted">Target</span> <span className="text-terminal-green tabular-nums">{idea.target}</span></div>
        <div><span className="text-terminal-muted">Stop</span> <span className="text-terminal-red tabular-nums">{idea.stop_loss}</span></div>
      </div>
      <p className="text-[10px] text-terminal-dim leading-relaxed">{idea.reason}</p>
    </div>
  );
}

// ── Stock idea card ───────────────────────────────────────────────────────────

function StockCard({
  idea,
  suggestionId,
}: {
  idea: StockIdea;
  suggestionId: string;
}) {
  const [rating, setRating] = useState(0);
  const isUp = idea.bias === "BUY";
  return (
    <div className={`rounded border bg-terminal-bg/60 p-3 border-l-2 ${isUp ? "border-l-terminal-green border-terminal-border" : "border-l-terminal-red border-terminal-border"}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm font-bold text-terminal-text">{idea.symbol}</span>
        <span className="text-[9px] text-terminal-muted">{idea.exchange}</span>
        <BiasChip bias={idea.bias} />
        <div className="flex-1" />
        <StarRating
          suggestionId={suggestionId}
          ideaId={idea.id}
          value={rating}
          onChange={setRating}
        />
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[10px] mb-1.5">
        <div><span className="text-terminal-muted">Entry</span> <span className="text-terminal-text tabular-nums">{idea.entry}</span></div>
        <div><span className="text-terminal-muted">Target</span> <span className="text-terminal-green tabular-nums">{idea.target}</span></div>
        <div><span className="text-terminal-muted">Stop</span> <span className="text-terminal-red tabular-nums">{idea.stop_loss}</span></div>
      </div>
      <p className="text-[10px] text-terminal-dim leading-relaxed">{idea.reason}</p>
    </div>
  );
}

// ── Options idea card ─────────────────────────────────────────────────────────

function OptionsCard({
  idea,
  suggestionId,
}: {
  idea: OptionsIdea;
  suggestionId: string;
}) {
  const [rating, setRating] = useState(0);
  const isUp = idea.bias === "BUY";
  return (
    <div className={`rounded border bg-terminal-bg/60 p-3 border-l-2 ${isUp ? "border-l-terminal-green border-terminal-border" : "border-l-terminal-red border-terminal-border"}`}>
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-xs font-bold text-terminal-text">{idea.instrument}</span>
        <span className="text-[9px] text-terminal-muted capitalize">{idea.expiry}</span>
        <BiasChip bias={idea.bias} />
        <div className="flex-1" />
        <StarRating
          suggestionId={suggestionId}
          ideaId={idea.id}
          value={rating}
          onChange={setRating}
        />
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[10px] mb-1.5">
        <div><span className="text-terminal-muted">Entry</span> <span className="text-terminal-text tabular-nums">{idea.entry}</span></div>
        <div><span className="text-terminal-muted">Target</span> <span className="text-terminal-green tabular-nums">{idea.target}</span></div>
        <div><span className="text-terminal-muted">Stop</span> <span className="text-terminal-red tabular-nums">{idea.stop_loss}</span></div>
      </div>
      <p className="text-[10px] text-terminal-dim leading-relaxed">{idea.reason}</p>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-terminal-border/50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-terminal-header/50 transition-colors"
      >
        {icon}
        <span className="text-[10px] text-terminal-dim tracking-widest font-medium flex-1 text-left">{title}</span>
        {open ? <ChevronUp size={10} className="text-terminal-muted" /> : <ChevronDown size={10} className="text-terminal-muted" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function AiSuggestions() {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery<MarketPulse>({
    queryKey: ["ai-market-pulse"],
    queryFn: () => axios.get("/api/ai/market-pulse").then((r) => r.data),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex flex-col h-full bg-terminal-panel overflow-y-auto">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-terminal-border shrink-0">
        <Bot size={12} className="text-terminal-blue" />
        <span className="text-terminal-dim text-xs tracking-widest font-medium">AI MARKET PULSE</span>
        {lastUpdated && (
          <span className="text-terminal-muted text-[10px]">Updated {lastUpdated}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] text-terminal-muted">Rate ideas to improve future suggestions</span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-terminal-dim hover:text-terminal-blue transition-colors disabled:opacity-40"
            title="Refresh analysis"
          >
            <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-terminal-dim">
          <Bot size={28} className="text-terminal-blue animate-pulse" />
          <p className="text-sm">Generating market pulse...</p>
          <p className="text-[10px] text-terminal-muted">Analysing news + market data with AI</p>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <AlertTriangle size={20} className="text-terminal-red mx-auto" />
            <p className="text-terminal-red text-xs">{(error as any)?.response?.data?.error ?? "Failed to load"}</p>
            <button onClick={() => refetch()} className="text-terminal-blue text-[10px] hover:underline">Try again</button>
          </div>
        </div>
      )}

      {/* Content */}
      {data && (
        <>
          {/* Bias + summary */}
          <div className="px-4 py-3 border-b border-terminal-border shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <BiasChip bias={data.market_bias} />
              {data.key_themes?.map((t, i) => (
                <span key={i} className="px-1.5 py-0.5 text-[9px] rounded bg-terminal-border/60 text-terminal-dim">{t}</span>
              ))}
            </div>
            <p className="text-xs text-terminal-text leading-relaxed">{data.summary}</p>
          </div>

          {/* Sectors */}
          <Section
            title="SECTOR OUTLOOK"
            icon={<Zap size={9} className="text-terminal-muted" />}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] text-terminal-muted mb-1.5 tracking-wider">BULLISH</p>
                <div className="space-y-1">
                  {data.bullish_sectors?.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-terminal-green">
                      <TrendingUp size={9} /> {s}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[9px] text-terminal-muted mb-1.5 tracking-wider">BEARISH</p>
                <div className="space-y-1">
                  {data.bearish_sectors?.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-terminal-red">
                      <TrendingDown size={9} /> {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Index ideas */}
          {data.index_ideas?.length > 0 && (
            <Section
              title="INDEX TRADE IDEAS"
              icon={<TrendingUp size={9} className="text-terminal-blue" />}
            >
              {data.index_ideas.map((idea) => (
                <IndexCard key={idea.id} idea={idea} suggestionId={data._id} />
              ))}
            </Section>
          )}

          {/* Stock ideas */}
          {data.stock_ideas?.length > 0 && (
            <Section
              title="STOCK TRADE IDEAS"
              icon={<TrendingUp size={9} className="text-terminal-muted" />}
            >
              {data.stock_ideas.map((idea) => (
                <StockCard key={idea.id} idea={idea} suggestionId={data._id} />
              ))}
            </Section>
          )}

          {/* Options ideas */}
          {data.options_ideas?.length > 0 && (
            <Section
              title="OPTIONS TRADE IDEAS"
              icon={<Zap size={9} className="text-terminal-muted" />}
            >
              {data.options_ideas.map((idea) => (
                <OptionsCard key={idea.id} idea={idea} suggestionId={data._id} />
              ))}
            </Section>
          )}

          {/* Footer */}
          <div className="px-4 py-3 text-[9px] text-terminal-muted border-t border-terminal-border mt-auto shrink-0">
            AI analysis is for informational purposes only. Not financial advice. Rate ideas (stars) to improve future suggestions.
          </div>
        </>
      )}
    </div>
  );
}

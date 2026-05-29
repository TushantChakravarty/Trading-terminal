import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { X, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw } from "lucide-react";
import type { StockFundamentals, QuarterlyResult, AnnualResult } from "../../types";

// ── Number formatters ─────────────────────────────────────────────────────────

function fmtCr(val: number | null): string {
  if (val == null || val === 0) return "—";
  const cr = val / 1e7; // 1 crore = 10M
  if (cr >= 1e5) return `₹${(cr / 1e5).toFixed(2)}L Cr`;
  if (cr >= 1e3) return `₹${(cr / 1e3).toFixed(1)}K Cr`;
  if (cr >= 1)   return `₹${cr.toFixed(0)} Cr`;
  return `₹${val.toLocaleString("en-IN")}`;
}

function fmtNum(val: number | null, decimals = 1): string {
  if (val == null) return "—";
  return val.toFixed(decimals);
}

function fmtPrice(val: number | null): string {
  if (val == null || val === 0) return "—";
  return `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtPct(val: number | null): string {
  if (val == null) return "—";
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
}

// ── Growth badge ──────────────────────────────────────────────────────────────

function GrowthBadge({ val }: { val: number | null }) {
  if (val == null) return <span className="text-terminal-muted text-[9px]">—</span>;
  const positive = val >= 0;
  return (
    <span className={`text-[9px] font-bold ${positive ? "text-terminal-green" : "text-terminal-red"}`}>
      {positive ? "▲" : "▼"}{Math.abs(val).toFixed(1)}%
    </span>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col px-3 py-2 rounded bg-terminal-header border border-terminal-border/50">
      <span className="text-[8px] text-terminal-muted tracking-widest uppercase">{label}</span>
      <span className="text-sm font-mono font-semibold text-terminal-text mt-0.5">{value}</span>
      {sub && <span className="text-[9px] text-terminal-dim">{sub}</span>}
    </div>
  );
}

// ── Quarterly table ───────────────────────────────────────────────────────────

function QuarterlyTable({ rows }: { rows: QuarterlyResult[] }) {
  if (!rows.length) return <p className="text-[10px] text-terminal-muted px-1">No quarterly data available</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] font-mono border-collapse">
        <thead>
          <tr className="border-b border-terminal-border/40">
            <th className="text-left text-terminal-muted py-1.5 pr-3 font-normal tracking-wider whitespace-nowrap">PERIOD</th>
            <th className="text-right text-terminal-muted py-1.5 pr-3 font-normal tracking-wider whitespace-nowrap">REVENUE</th>
            <th className="text-right text-terminal-muted py-1.5 pr-3 font-normal tracking-wider whitespace-nowrap">YoY</th>
            <th className="text-right text-terminal-muted py-1.5 pr-3 font-normal tracking-wider whitespace-nowrap">NET PROFIT</th>
            <th className="text-right text-terminal-muted py-1.5 pr-3 font-normal tracking-wider whitespace-nowrap">YoY</th>
            <th className="text-right text-terminal-muted py-1.5 font-normal tracking-wider whitespace-nowrap">EPS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`border-b border-terminal-border/20 ${i === 0 ? "bg-terminal-blue/5" : ""}`}
            >
              <td className="py-1.5 pr-3 text-terminal-text font-medium whitespace-nowrap">{r.period}</td>
              <td className="py-1.5 pr-3 text-right text-terminal-dim tabular-nums whitespace-nowrap">{fmtCr(r.revenue)}</td>
              <td className="py-1.5 pr-3 text-right whitespace-nowrap"><GrowthBadge val={r.yoyRevenueGrowth} /></td>
              <td className={`py-1.5 pr-3 text-right tabular-nums whitespace-nowrap ${r.netProfit >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
                {fmtCr(r.netProfit)}
              </td>
              <td className="py-1.5 pr-3 text-right whitespace-nowrap"><GrowthBadge val={r.yoyProfitGrowth} /></td>
              <td className="py-1.5 text-right text-terminal-dim tabular-nums whitespace-nowrap">
                {r.eps !== 0 ? fmtNum(r.eps, 2) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Annual table ──────────────────────────────────────────────────────────────

function AnnualTable({ rows }: { rows: AnnualResult[] }) {
  if (!rows.length) return <p className="text-[10px] text-terminal-muted px-1">No annual data available</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px] font-mono border-collapse">
        <thead>
          <tr className="border-b border-terminal-border/40">
            <th className="text-left text-terminal-muted py-1.5 pr-3 font-normal tracking-wider">FY</th>
            <th className="text-right text-terminal-muted py-1.5 pr-3 font-normal tracking-wider whitespace-nowrap">REVENUE</th>
            <th className="text-right text-terminal-muted py-1.5 pr-3 font-normal tracking-wider">YoY</th>
            <th className="text-right text-terminal-muted py-1.5 pr-3 font-normal tracking-wider whitespace-nowrap">NET PROFIT</th>
            <th className="text-right text-terminal-muted py-1.5 pr-3 font-normal tracking-wider">YoY</th>
            <th className="text-right text-terminal-muted py-1.5 font-normal tracking-wider">EPS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-b border-terminal-border/20 ${i === 0 ? "bg-terminal-blue/5" : ""}`}>
              <td className="py-1.5 pr-3 text-terminal-text font-semibold">{r.period}</td>
              <td className="py-1.5 pr-3 text-right text-terminal-dim tabular-nums whitespace-nowrap">{fmtCr(r.revenue)}</td>
              <td className="py-1.5 pr-3 text-right"><GrowthBadge val={r.yoyRevenueGrowth} /></td>
              <td className={`py-1.5 pr-3 text-right tabular-nums whitespace-nowrap ${r.netProfit >= 0 ? "text-terminal-green" : "text-terminal-red"}`}>
                {fmtCr(r.netProfit)}
              </td>
              <td className="py-1.5 pr-3 text-right"><GrowthBadge val={r.yoyProfitGrowth} /></td>
              <td className="py-1.5 text-right text-terminal-dim tabular-nums">
                {r.eps !== 0 ? fmtNum(r.eps, 2) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHead({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[9px] text-terminal-muted tracking-[0.15em] font-medium">{label}</span>
      <div className="flex-1 border-t border-terminal-border/40" />
    </div>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────

interface Props {
  symbol: string;     // NSE symbol e.g. "HFCL"
  displayName: string;
  onClose: () => void;
}

export function StockDetailDrawer({ symbol, displayName, onClose }: Props) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<StockFundamentals>({
    queryKey: ["fundamentals", symbol],
    queryFn: () => axios.get(`/api/fundamentals/${symbol}`).then((r) => r.data),
    staleTime: 15 * 60_000,
    retry: 1,
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // 52W range percentage
  const rangePos =
    data?.high52W && data?.low52W && data?.ltp
      ? Math.round(((data.ltp - data.low52W) / (data.high52W - data.low52W)) * 100)
      : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-terminal-bg border-l border-terminal-border flex flex-col font-mono shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-terminal-border shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-terminal-text tracking-wide">{symbol}</span>
              <span className="text-[9px] text-terminal-muted border border-terminal-border/50 px-1.5 py-0.5 rounded">NSE · EQ</span>
              {isFetching && <RefreshCw size={10} className="animate-spin text-terminal-dim" />}
            </div>
            <p className="text-[11px] text-terminal-dim mt-0.5 truncate">{displayName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-terminal-dim hover:text-terminal-text transition-colors p-1"
            title="Close (Esc)"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-terminal-dim">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-xs tracking-widest">FETCHING FUNDAMENTALS...</span>
              <span className="text-[10px] text-terminal-muted">via Yahoo Finance · NSE data</span>
            </div>
          )}

          {isError && (
            <div className="py-8 text-center space-y-2">
              <p className="text-[11px] text-terminal-red">
                {(error as any)?.response?.data?.error ?? "Could not fetch fundamentals"}
              </p>
              <p className="text-[10px] text-terminal-muted">
                Yahoo Finance may not cover this stock or is temporarily unavailable
              </p>
              <button
                onClick={() => refetch()}
                className="mt-2 px-3 py-1 text-[10px] rounded border border-terminal-border text-terminal-dim hover:text-terminal-text"
              >
                Retry
              </button>
            </div>
          )}

          {data && (
            <>
              {/* ── Key Metrics ── */}
              <div>
                <SectionHead label="KEY METRICS" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <MetricCard label="MARKET CAP"    value={fmtCr(data.marketCap)} />
                  <MetricCard label="P/E (TTM)"     value={data.pe     != null ? `${fmtNum(data.pe, 1)}x`  : "—"} sub={data.forwardPE != null ? `Fwd ${fmtNum(data.forwardPE, 1)}x` : undefined} />
                  <MetricCard label="EPS (TTM)"     value={data.eps    != null ? `₹${fmtNum(data.eps, 2)}` : "—"} />
                  <MetricCard label="P/B RATIO"     value={data.pb     != null ? `${fmtNum(data.pb, 2)}x`  : "—"} sub={data.bookValue != null ? `BV ₹${fmtNum(data.bookValue, 0)}` : undefined} />
                  <MetricCard label="DIV YIELD"     value={data.dividendYield != null ? fmtPct(data.dividendYield * 100) : "—"} />
                  <MetricCard label="LTP"           value={fmtPrice(data.ltp)} />
                </div>
              </div>

              {/* ── 52-week range ── */}
              {data.high52W != null && data.low52W != null && (
                <div>
                  <SectionHead label="52-WEEK RANGE" />
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-terminal-dim">
                      <span>L {fmtPrice(data.low52W)}</span>
                      {rangePos != null && (
                        <span className={`font-medium ${rangePos > 70 ? "text-terminal-green" : rangePos < 30 ? "text-terminal-red" : "text-terminal-yellow"}`}>
                          {rangePos}% from low
                        </span>
                      )}
                      <span>H {fmtPrice(data.high52W)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-terminal-border/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-terminal-blue/70"
                        style={{ width: `${rangePos ?? 50}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Quarterly Results ── */}
              <div>
                <SectionHead label={`QUARTERLY RESULTS · LAST ${data.quarterly.length} QUARTERS`} />
                <QuarterlyTable rows={data.quarterly} />
              </div>

              {/* ── Annual Results ── */}
              <div>
                <SectionHead label={`ANNUAL RESULTS · LAST ${data.annual.length} YEARS`} />
                <AnnualTable rows={data.annual} />
              </div>

              {/* Footer note */}
              <p className="text-[8px] text-terminal-muted/50 text-center pb-2">
                Data via Yahoo Finance · INR · {new Date().toLocaleDateString("en-IN")}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { OptionsChainData, OptionLeg, OptionStrike } from "../../types";
import { useTerminalStore } from "../../store";

const UNDERLYINGS = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX"];

function fmt(n: number) {
  if (!n && n !== 0) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function fmtOI(n: number) {
  if (!n) return "—";
  if (n >= 1_00_00_000) return (n / 1_00_00_000).toFixed(1) + "Cr";
  if (n >= 1_00_000)    return (n / 1_00_000).toFixed(1) + "L";
  if (n >= 1_000)       return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

// ── OI bar ───────────────────────────────────────────────────────────────────

function OIBar({ oi, maxOI, side }: { oi: number; maxOI: number; side: "CE" | "PE" }) {
  const pct = maxOI > 0 ? Math.min(100, (oi / maxOI) * 100) : 0;
  return (
    <div className={`flex items-center h-4 ${side === "CE" ? "justify-end" : "justify-start"}`}>
      <div
        className={`h-1.5 rounded-sm opacity-70 ${side === "CE" ? "bg-terminal-green" : "bg-terminal-red"}`}
        style={{
          width: `${pct}%`,
          minWidth: pct > 0 ? "2px" : "0",
        }}
      />
    </div>
  );
}

// ── PCR badge ────────────────────────────────────────────────────────────────

function PCRBadge({ pcr }: { pcr: number }) {
  const label = pcr > 1.2 ? "BULLISH" : pcr < 0.8 ? "BEARISH" : "NEUTRAL";
  const cls   = pcr > 1.2 ? "text-terminal-green border-terminal-green/40 bg-terminal-green/10"
              : pcr < 0.8 ? "text-terminal-red border-terminal-red/40 bg-terminal-red/10"
              :              "text-terminal-yellow border-terminal-yellow/40 bg-terminal-yellow/10";
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-medium ${cls}`}>
      <span>PCR {pcr.toFixed(2)}</span>
      <span className="opacity-60">·</span>
      <span>{label}</span>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function ChainRow({
  row,
  isATM,
  isMaxPain,
  maxCallOI,
  maxPutOI,
}: {
  row: OptionStrike;
  isATM: boolean;
  isMaxPain: boolean;
  maxCallOI: number;
  maxPutOI: number;
}) {
  const ce = row.CE;
  const pe = row.PE;

  const rowBg = isATM
    ? "bg-terminal-blue/10 border-y border-terminal-blue/25"
    : "hover:bg-terminal-header/60";

  return (
    <tr className={`border-b border-terminal-border/30 transition-colors ${rowBg}`}>
      {/* ── CALL side ── */}
      {/* OI bar */}
      <td className="px-1 w-20">
        <OIBar oi={ce?.oi ?? 0} maxOI={maxCallOI} side="CE" />
      </td>
      {/* OI number */}
      <td className="px-2 py-1.5 text-[11px] tabular-nums text-right text-terminal-dim w-16">
        {fmtOI(ce?.oi ?? 0)}
      </td>
      {/* OI change */}
      <td className={`px-2 py-1.5 text-[10px] tabular-nums text-right w-12 ${
        (ce?.oiChange ?? 0) >= 0 ? "text-terminal-green" : "text-terminal-red"
      }`}>
        {ce?.oiChange ? (ce.oiChange >= 0 ? "▲" : "▼") + fmtOI(Math.abs(ce.oiChange)) : "—"}
      </td>
      {/* LTP — most important, prominent */}
      <td className={`px-3 py-1.5 text-xs font-semibold tabular-nums text-right ${
        isATM ? "text-white" : "text-terminal-green"
      }`}>
        {fmt(ce?.ltp ?? 0)}
      </td>

      {/* ── STRIKE ── */}
      <td className={`px-4 py-1.5 text-xs font-bold text-center tabular-nums ${
        isATM    ? "text-terminal-blue"
        : isMaxPain ? "text-terminal-yellow"
        :              "text-terminal-text"
      }`}>
        {isATM && <span className="text-[9px] text-terminal-blue mr-1">ATM</span>}
        {isMaxPain && !isATM && <span className="text-[9px] text-terminal-yellow mr-1">MP</span>}
        {row.strike.toLocaleString("en-IN")}
      </td>

      {/* ── PUT side ── */}
      {/* LTP */}
      <td className={`px-3 py-1.5 text-xs font-semibold tabular-nums text-left ${
        isATM ? "text-white" : "text-terminal-red"
      }`}>
        {fmt(pe?.ltp ?? 0)}
      </td>
      {/* OI change */}
      <td className={`px-2 py-1.5 text-[10px] tabular-nums text-left w-12 ${
        (pe?.oiChange ?? 0) >= 0 ? "text-terminal-green" : "text-terminal-red"
      }`}>
        {pe?.oiChange ? (pe.oiChange >= 0 ? "▲" : "▼") + fmtOI(Math.abs(pe.oiChange)) : "—"}
      </td>
      {/* OI number */}
      <td className="px-2 py-1.5 text-[11px] tabular-nums text-left text-terminal-dim w-16">
        {fmtOI(pe?.oi ?? 0)}
      </td>
      {/* OI bar */}
      <td className="px-1 w-20">
        <OIBar oi={pe?.oi ?? 0} maxOI={maxPutOI} side="PE" />
      </td>
    </tr>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function OptionsChain() {
  const [underlying, setUnderlying] = useState("NIFTY");
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>(null);
  const isAuthenticated = useTerminalStore((s) => s.isAuthenticated);

  const { data, isLoading, error, refetch } = useQuery<OptionsChainData, AxiosError<{ error: string }>>({
    queryKey: ["options", underlying, selectedExpiry],
    queryFn: () =>
      axios
        .get(`/api/options/${underlying}${selectedExpiry ? `?expiry=${selectedExpiry}` : ""}`)
        .then((r) => r.data),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  // Derived stats
  const { atmStrike, maxPainStrike, maxCallOI, maxPutOI, pcr, totalCallOI, totalPutOI } =
    useMemo(() => {
      if (!data?.strikes.length)
        return { atmStrike: 0, maxPainStrike: 0, maxCallOI: 1, maxPutOI: 1, pcr: 1, totalCallOI: 0, totalPutOI: 0 };

      const mid = data.strikes[Math.floor(data.strikes.length / 2)].strike;
      const atm = data.strikes.reduce((p, c) =>
        Math.abs(c.strike - mid) < Math.abs(p.strike - mid) ? c : p
      ).strike;

      const maxCall = Math.max(...data.strikes.map((s) => s.CE?.oi ?? 0), 1);
      const maxPut  = Math.max(...data.strikes.map((s) => s.PE?.oi ?? 0), 1);

      let tCallOI = 0, tPutOI = 0;
      data.strikes.forEach((s) => { tCallOI += s.CE?.oi ?? 0; tPutOI += s.PE?.oi ?? 0; });
      const ratio = tCallOI > 0 ? tPutOI / tCallOI : 1;

      // Max pain
      let minPain = Infinity, mpStrike = atm;
      data.strikes.forEach(({ strike: S }) => {
        let pain = 0;
        data.strikes.forEach(({ strike: K, CE, PE }) => {
          if (K < S) pain += (S - K) * (CE?.oi ?? 0);
          if (K > S) pain += (K - S) * (PE?.oi ?? 0);
        });
        if (pain < minPain) { minPain = pain; mpStrike = S; }
      });

      return { atmStrike: atm, maxPainStrike: mpStrike, maxCallOI: maxCall, maxPutOI: maxPut, pcr: ratio, totalCallOI: tCallOI, totalPutOI: tPutOI };
    }, [data]);

  return (
    <div className="flex flex-col h-full bg-terminal-panel">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-terminal-border shrink-0 flex-wrap gap-y-1.5">
        {/* Underlying selector */}
        <div className="flex gap-1">
          {UNDERLYINGS.map((u) => (
            <button
              key={u}
              onClick={() => { setUnderlying(u); setSelectedExpiry(null); }}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                underlying === u ? "bg-terminal-blue text-white" : "text-terminal-dim hover:text-terminal-text"
              }`}
            >
              {u}
            </button>
          ))}
        </div>

        {/* Expiry selector */}
        {data?.expiries && (
          <div className="flex gap-1 flex-wrap">
            {data.expiries.slice(0, 5).map((exp) => (
              <button
                key={exp}
                onClick={() => setSelectedExpiry(exp)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  (selectedExpiry ?? data.selectedExpiry) === exp
                    ? "bg-terminal-yellow/20 text-terminal-yellow border border-terminal-yellow/40"
                    : "text-terminal-dim hover:text-terminal-text"
                }`}
              >
                {exp}
              </button>
            ))}
          </div>
        )}

        {/* PCR badge */}
        {data && <div className="ml-auto"><PCRBadge pcr={pcr} /></div>}
      </div>

      {/* ── Stats bar ── */}
      {data && (
        <div className="flex items-center gap-4 px-3 py-1.5 bg-terminal-header border-b border-terminal-border text-[10px] shrink-0">
          <span className="text-terminal-dim">Total Call OI: <span className="text-terminal-green font-medium">{fmtOI(totalCallOI)}</span></span>
          <span className="text-terminal-dim">Total Put OI: <span className="text-terminal-red font-medium">{fmtOI(totalPutOI)}</span></span>
          <span className="text-terminal-dim">Max Pain: <span className="text-terminal-yellow font-medium">{maxPainStrike.toLocaleString("en-IN")}</span></span>
          <span className="text-terminal-dim">ATM: <span className="text-terminal-blue font-medium">{atmStrike.toLocaleString("en-IN")}</span></span>
        </div>
      )}

      {!isAuthenticated && (
        <div className="flex-1 flex items-center justify-center flex-col gap-2">
          <span className="text-terminal-dim text-sm">Options chain unavailable</span>
          <span className="text-terminal-muted text-xs">Login with Zerodha to access live F&O data</span>
        </div>
      )}

      {isAuthenticated && isLoading && (
        <div className="flex-1 flex items-center justify-center text-terminal-dim text-sm">
          Loading options chain...
        </div>
      )}

      {isAuthenticated && error && (
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <span className="text-terminal-red text-sm">Could not load options chain</span>
          <span className="text-terminal-muted text-xs text-center px-8">
            {error.response?.data?.error ?? error.message}
          </span>
          <button
            onClick={() => refetch()}
            className="text-[10px] text-terminal-blue hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Chain table ── */}
      {data && !isLoading && (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-terminal-header z-10 border-b border-terminal-border">
              <tr>
                {/* CALL side */}
                <th className="px-1 py-2 text-[9px] text-terminal-dim font-normal text-right w-20">OI Bar</th>
                <th className="px-2 py-2 text-[10px] text-terminal-dim font-normal text-right">OI</th>
                <th className="px-2 py-2 text-[10px] text-terminal-dim font-normal text-right">Chg</th>
                <th className="px-3 py-2 text-[11px] text-terminal-green font-semibold text-right">CALL</th>

                <th className="px-4 py-2 text-[11px] text-terminal-blue font-bold text-center bg-terminal-panel">
                  STRIKE
                </th>

                {/* PUT side */}
                <th className="px-3 py-2 text-[11px] text-terminal-red font-semibold text-left">PUT</th>
                <th className="px-2 py-2 text-[10px] text-terminal-dim font-normal text-left">Chg</th>
                <th className="px-2 py-2 text-[10px] text-terminal-dim font-normal text-left">OI</th>
                <th className="px-1 py-2 text-[9px] text-terminal-dim font-normal text-left w-20">OI Bar</th>
              </tr>
            </thead>
            <tbody>
              {data.strikes.map((row) => (
                <ChainRow
                  key={row.strike}
                  row={row}
                  isATM={row.strike === atmStrike}
                  isMaxPain={row.strike === maxPainStrike}
                  maxCallOI={maxCallOI}
                  maxPutOI={maxPutOI}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

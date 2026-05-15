import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
} from "lightweight-charts";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Bot, Loader2, X, RefreshCw } from "lucide-react";
import { useTerminalStore } from "../../store";

const INTERVALS: { value: string; label: string; days: number }[] = [
  { value: "5minute",  label: "5m",  days: 10  },
  { value: "15minute", label: "15m", days: 30  },
  { value: "60minute", label: "1h",  days: 60  },
  { value: "day",      label: "1D",  days: 365 },
];

// Safe IST midnight timestamp — avoids locale-format Date parsing bugs
function istDayStart(): number {
  const istStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // "YYYY-MM-DD"
  return Math.floor(new Date(istStr).getTime() / 1000);
}

// ── AI Panel ──────────────────────────────────────────────────────────────────

function AiPanel({
  symbol,
  token,
  onClose,
}: {
  symbol: string;
  token: number;
  onClose: () => void;
}) {
  const { data, isLoading, error, refetch, isFetching } = useQuery<{
    analysis: string;
    cached: boolean;
  }>({
    queryKey: ["ai-suggest", symbol, token],
    queryFn: () =>
      axios
        .get(`/api/ai/suggest?symbol=${encodeURIComponent(symbol)}&token=${token}`)
        .then((r) => r.data),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const lines = data?.analysis
    ? data.analysis.split("\n").filter((l) => l.trim())
    : [];

  return (
    <div className="border-b border-terminal-border bg-terminal-bg/80 px-4 py-3 shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <Bot size={11} className="text-terminal-blue" />
        <span className="text-[10px] text-terminal-dim tracking-widest font-medium">AI ANALYSIS</span>
        {data?.cached && (
          <span className="text-[9px] text-terminal-muted">(cached)</span>
        )}
        <div className="flex-1" />
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-terminal-muted hover:text-terminal-blue transition-colors disabled:opacity-40"
          title="Refresh analysis"
        >
          <RefreshCw size={9} className={isFetching ? "animate-spin" : ""} />
        </button>
        <button
          onClick={onClose}
          className="text-terminal-muted hover:text-terminal-red transition-colors"
        >
          <X size={10} />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-terminal-muted text-[10px]">
          <Loader2 size={10} className="animate-spin" />
          Generating analysis... (may take 10-20s on first run)
        </div>
      )}

      {error && (
        <div className="text-terminal-red text-[10px]">
          {(error as any)?.response?.data?.error ?? "Failed to load analysis"}
        </div>
      )}

      {lines.length > 0 && (
        <div className="space-y-1">
          {lines.map((line, i) => {
            const isBias  = line.startsWith("BIAS:");
            const isLabel = /^[A-Z ]+:/.test(line);
            return (
              <p
                key={i}
                className={`text-[11px] leading-relaxed ${
                  isBias
                    ? line.includes("BUY")
                      ? "text-terminal-green font-semibold"
                      : line.includes("SELL")
                      ? "text-terminal-red font-semibold"
                      : "text-terminal-yellow font-semibold"
                    : isLabel
                    ? "text-terminal-text"
                    : "text-terminal-dim"
                }`}
              >
                {line}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main chart ────────────────────────────────────────────────────────────────

export function CandleChart() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const chartRef      = useRef<IChartApi | null>(null);
  const candleRef     = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef     = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [interval, setInterval] = useState("day");
  const [showAI, setShowAI]     = useState(false);
  const selectedInterval = INTERVALS.find((i) => i.value === interval) ?? INTERVALS[3];

  const selectedToken  = useTerminalStore((s) => s.selectedToken);
  const selectedSymbol = useTerminalStore((s) => s.selectedSymbol);
  const tick = useTerminalStore((s) => (selectedToken ? s.ticks[selectedToken] : null));

  const { data, isLoading, error } = useQuery({
    queryKey: ["history", selectedToken, interval],
    queryFn: () =>
      axios
        .get(`/api/quotes/history/${selectedToken}?interval=${interval}&days=${selectedInterval.days}`)
        .then((r) => r.data),
    enabled: !!selectedToken,
    staleTime: 60_000,
    retry: 1,
  });

  // Init chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0a0c10" },
        textColor: "#8892a4",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1e2332" },
        horzLines: { color: "#1e2332" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1e2332" },
      timeScale: { borderColor: "#1e2332", timeVisible: true },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor:        "#00e676",
      downColor:      "#ff3d57",
      borderUpColor:  "#00e676",
      borderDownColor:"#ff3d57",
      wickUpColor:    "#00e676",
      wickDownColor:  "#ff3d57",
    });

    const volumeSeries = chart.addHistogramSeries({
      color: "#4d9fff40",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current  = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current  = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, []);

  // Load historical data whenever token or interval changes
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current) return;

    if (!data || data.length === 0) {
      candleRef.current.setData([]);
      volumeRef.current.setData([]);
      return;
    }

    const candles: CandlestickData[] = data
      .map((d: any) => ({
        time:  Math.floor(new Date(d.date).getTime() / 1000) as any,
        open:  d.open,
        high:  d.high,
        low:   d.low,
        close: d.close,
      }))
      .filter((c: any) => c.time > 0);

    const volumes: HistogramData[] = data
      .map((d: any) => ({
        time:  Math.floor(new Date(d.date).getTime() / 1000) as any,
        value: d.volume,
        color: d.close >= d.open ? "#00e67630" : "#ff3d5730",
      }))
      .filter((v: any) => v.time > 0);

    candleRef.current.setData(candles);
    volumeRef.current.setData(volumes);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  // Update the current candle with live tick (day interval only)
  useEffect(() => {
    if (!tick || !candleRef.current || interval !== "day") return;
    const ltp  = tick.last_price;
    const ohlc = tick.ohlc;
    if (!ohlc || !ltp) return;

    const dayStart = istDayStart();
    if (!dayStart) return;

    candleRef.current.update({
      time:  dayStart as any,
      open:  ohlc.open,
      high:  Math.max(ohlc.high, ltp),
      low:   Math.min(ohlc.low, ltp),
      close: ltp,
    });
  }, [tick?.last_price, interval]);

  const ltp       = tick?.last_price ?? 0;
  const ohlc      = tick?.ohlc;
  const change    = ohlc?.close ? ltp - ohlc.close : 0;
  const changePct = ohlc?.close ? (change / ohlc.close) * 100 : 0;
  const isUp      = change >= 0;

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-terminal-border bg-terminal-panel shrink-0 flex-wrap">
        <span className="text-terminal-text text-sm font-medium">
          {selectedSymbol.split(":")[1] ?? selectedSymbol}
        </span>

        {ltp > 0 && (
          <>
            <span className="text-terminal-text tabular-nums font-medium">
              {ltp.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
            <span className={`text-xs tabular-nums ${isUp ? "text-terminal-green" : "text-terminal-red"}`}>
              {isUp ? "+" : ""}{change.toFixed(2)} ({isUp ? "+" : ""}{changePct.toFixed(2)}%)
            </span>
            {ohlc && (
              <div className="flex gap-3 text-[10px] text-terminal-dim">
                <span>O {ohlc.open.toLocaleString("en-IN")}</span>
                <span>H {ohlc.high.toLocaleString("en-IN")}</span>
                <span>L {ohlc.low.toLocaleString("en-IN")}</span>
                <span>C {ohlc.close.toLocaleString("en-IN")}</span>
              </div>
            )}
          </>
        )}

        <div className="flex-1" />

        {/* Interval tabs */}
        <div className="flex gap-0.5">
          {INTERVALS.map((iv) => (
            <button
              key={iv.value}
              onClick={() => setInterval(iv.value)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                interval === iv.value
                  ? "bg-terminal-blue text-white"
                  : "text-terminal-dim hover:text-terminal-text"
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>

        {/* AI button */}
        {selectedToken && (
          <button
            onClick={() => setShowAI((v) => !v)}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border transition-colors ${
              showAI
                ? "bg-terminal-blue/20 border-terminal-blue text-terminal-blue"
                : "border-terminal-border text-terminal-dim hover:text-terminal-blue hover:border-terminal-blue"
            }`}
            title="AI trade suggestion"
          >
            <Bot size={9} />
            AI
          </button>
        )}

        {isLoading && <span className="text-terminal-muted text-[10px]">Loading...</span>}
        {error    && <span className="text-terminal-red text-[10px]">Failed to load</span>}
      </div>

      {/* AI Panel */}
      {showAI && selectedToken && (
        <AiPanel
          symbol={selectedSymbol}
          token={selectedToken}
          onClose={() => setShowAI(false)}
        />
      )}

      {/* Chart canvas */}
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  );
}

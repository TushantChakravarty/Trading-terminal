import { useEffect, useRef } from "react";
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
import { useTerminalStore } from "../../store";

const INTERVALS = ["5minute", "15minute", "60minute", "day"];
const INTERVAL_LABELS: Record<string, string> = {
  "5minute": "5m",
  "15minute": "15m",
  "60minute": "1h",
  day: "1D",
};

export function CandleChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const selectedToken = useTerminalStore((s) => s.selectedToken);
  const selectedSymbol = useTerminalStore((s) => s.selectedSymbol);
  const tick = useTerminalStore((s) => (selectedToken ? s.ticks[selectedToken] : null));

  const { data, isLoading } = useQuery({
    queryKey: ["history", selectedToken, "day"],
    queryFn: () =>
      axios
        .get(`/api/quotes/history/${selectedToken}?interval=day&days=365`)
        .then((r) => r.data),
    enabled: !!selectedToken,
    staleTime: 60_000,
  });

  // Init chart
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
      upColor: "#00e676",
      downColor: "#ff3d57",
      borderUpColor: "#00e676",
      borderDownColor: "#ff3d57",
      wickUpColor: "#00e676",
      wickDownColor: "#ff3d57",
    });

    const volumeSeries = chart.addHistogramSeries({
      color: "#4d9fff40",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;

    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, []);

  // Load historical data
  useEffect(() => {
    if (!data || !candleRef.current || !volumeRef.current) return;

    const candles: CandlestickData[] = data.map((d: any) => ({
      time: Math.floor(new Date(d.date).getTime() / 1000) as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumes: HistogramData[] = data.map((d: any) => ({
      time: Math.floor(new Date(d.date).getTime() / 1000) as any,
      value: d.volume,
      color: d.close >= d.open ? "#00e67630" : "#ff3d5730",
    }));

    candleRef.current.setData(candles);
    volumeRef.current.setData(volumes);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  // Update last candle with live tick
  useEffect(() => {
    if (!tick || !candleRef.current) return;
    const ltp = tick.last_price;
    const ohlc = tick.ohlc;
    if (!ohlc) return;

    const now = Math.floor(Date.now() / 1000);
    const dayStart = Math.floor(
      new Date(new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })).getTime() / 1000
    );

    candleRef.current.update({
      time: dayStart as any,
      open: ohlc.open,
      high: ohlc.high,
      low: ohlc.low,
      close: ltp,
    });
  }, [tick?.last_price]);

  const ltp = tick?.last_price ?? 0;
  const ohlc = tick?.ohlc;
  const change = ohlc?.close ? ltp - ohlc.close : 0;
  const changePct = ohlc?.close ? (change / ohlc.close) * 100 : 0;
  const isUp = change >= 0;

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      {/* Chart header */}
      <div className="flex items-center gap-4 px-3 py-2 border-b border-terminal-border bg-terminal-panel shrink-0">
        <span className="text-terminal-text text-sm font-medium">
          {selectedSymbol.split(":")[1] ?? selectedSymbol}
        </span>
        {ltp > 0 && (
          <>
            <span className="text-terminal-text tabular-nums font-medium">
              {ltp.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
            <span className={`text-xs tabular-nums ${isUp ? "text-terminal-green" : "text-terminal-red"}`}>
              {isUp ? "+" : ""}
              {change.toFixed(2)} ({isUp ? "+" : ""}
              {changePct.toFixed(2)}%)
            </span>
            {ohlc && (
              <div className="flex gap-3 text-[10px] text-terminal-dim ml-2">
                <span>O {ohlc.open.toLocaleString("en-IN")}</span>
                <span>H {ohlc.high.toLocaleString("en-IN")}</span>
                <span>L {ohlc.low.toLocaleString("en-IN")}</span>
                <span>C {ohlc.close.toLocaleString("en-IN")}</span>
              </div>
            )}
          </>
        )}
        <div className="flex-1" />
        {isLoading && <span className="text-terminal-dim text-xs">Loading...</span>}
      </div>

      {/* Chart */}
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  );
}

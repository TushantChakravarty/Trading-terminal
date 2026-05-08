import { Plus, X } from "lucide-react";
import { useTerminalStore } from "../../store";

function pct(ltp: number, close: number) {
  if (!close) return 0;
  return ((ltp - close) / close) * 100;
}

export function Watchlist() {
  const { watchlist, ticks, selectedToken, setSelectedSymbol, removeFromWatchlist } =
    useTerminalStore();

  return (
    <div className="flex flex-col h-full bg-terminal-panel border-r border-terminal-border w-52 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border">
        <span className="text-terminal-dim text-xs tracking-widest font-medium">WATCHLIST</span>
        <button className="text-terminal-dim hover:text-terminal-blue transition-colors">
          <Plus size={13} />
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {watchlist.map((item) => {
          const tick = ticks[item.token];
          const ltp = tick?.last_price ?? 0;
          const close = tick?.ohlc?.close ?? 0;
          const change = pct(ltp, close);
          const isUp = change >= 0;
          const isSelected = selectedToken === item.token;

          return (
            <div
              key={item.symbol}
              onClick={() => setSelectedSymbol(`${item.exchange}:${item.symbol}`, item.token)}
              className={`group flex items-center justify-between px-3 py-2 cursor-pointer border-b border-terminal-border/50 hover:bg-terminal-header transition-colors ${
                isSelected ? "bg-terminal-header border-l-2 border-l-terminal-blue" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-terminal-text text-xs font-medium truncate">
                  {item.displayName}
                </div>
                <div className="text-terminal-dim text-[10px]">{item.exchange}</div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className="text-terminal-text text-xs tabular-nums">
                  {ltp > 0
                    ? ltp.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                    : "—"}
                </div>
                {ltp > 0 && (
                  <div
                    className={`text-[10px] tabular-nums ${isUp ? "text-terminal-green" : "text-terminal-red"}`}
                  >
                    {isUp ? "+" : ""}
                    {change.toFixed(2)}%
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromWatchlist(item.symbol);
                }}
                className="ml-1 text-terminal-muted opacity-0 group-hover:opacity-100 hover:text-terminal-red transition-all"
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-terminal-border">
        <p className="text-terminal-muted text-[10px]">{watchlist.length} instruments</p>
      </div>
    </div>
  );
}

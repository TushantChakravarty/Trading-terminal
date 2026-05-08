import { Activity, LogIn, LogOut, User } from "lucide-react";
import axios from "axios";
import { useTerminalStore } from "../../store";
import { MarketStatus } from "../../types";

function getMarketStatus(): MarketStatus {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const h = ist.getHours();
  const m = ist.getMinutes();
  const mins = h * 60 + m;
  const day = ist.getDay();

  if (day === 0 || day === 6) return "closed";
  if (mins >= 9 * 60 && mins < 9 * 60 + 15) return "pre-open";
  if (mins >= 9 * 60 + 15 && mins < 15 * 60 + 30) return "open";
  return "closed";
}

const STATUS_COLORS: Record<MarketStatus, string> = {
  open: "text-terminal-green",
  "pre-open": "text-terminal-yellow",
  closed: "text-terminal-red",
  "post-close": "text-terminal-muted",
};

const STATUS_LABELS: Record<MarketStatus, string> = {
  open: "MARKET OPEN",
  "pre-open": "PRE-OPEN",
  closed: "MARKET CLOSED",
  "post-close": "POST CLOSE",
};

interface IndexBadgeProps {
  label: string;
  token: number;
}

function IndexBadge({ label, token }: IndexBadgeProps) {
  const tick = useTerminalStore((s) => s.ticks[token]);
  const ltp = tick?.last_price ?? 0;
  const close = tick?.ohlc?.close ?? 0;
  const change = close > 0 ? ((ltp - close) / close) * 100 : 0;
  const isUp = change >= 0;

  return (
    <div className="flex items-center gap-2 px-3 border-r border-terminal-border">
      <span className="text-terminal-dim text-xs">{label}</span>
      <span className="text-terminal-text font-medium tabular-nums">
        {ltp > 0 ? ltp.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}
      </span>
      {ltp > 0 && (
        <span className={`text-xs tabular-nums ${isUp ? "text-terminal-green" : "text-terminal-red"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
        </span>
      )}
    </div>
  );
}

export function TopBar() {
  const { isAuthenticated, profile, setAppToken } = useTerminalStore();
  const status = getMarketStatus();

  function handleLogout() {
    setAppToken(null);
  }

  return (
    <div className="h-10 bg-terminal-header border-b border-terminal-border flex items-center px-2 shrink-0 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2 pr-3 border-r border-terminal-border">
        <Activity size={14} className="text-terminal-blue" />
        <span className="text-terminal-blue font-semibold text-sm tracking-widest">TERMINAL</span>
      </div>

      {/* Market status */}
      <div className={`px-3 border-r border-terminal-border text-xs font-medium ${STATUS_COLORS[status]}`}>
        ● {STATUS_LABELS[status]}
      </div>

      {/* Index badges — hidden on mobile */}
      <div className="hidden md:flex">
        <IndexBadge label="NIFTY" token={256265} />
        <IndexBadge label="BANKNIFTY" token={260105} />
        <IndexBadge label="SENSEX" token={265} />
        <IndexBadge label="VIX" token={264969} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Auth */}
      {isAuthenticated ? (
        <div className="flex items-center gap-2 text-xs text-terminal-dim px-2">
          <User size={12} className="text-terminal-green" />
          <span className="text-terminal-green">{profile?.user_name ?? "Connected"}</span>
        </div>
      ) : (
        <a
          href="/api/auth/login"
          className="flex items-center gap-1.5 px-3 py-1 bg-terminal-blue text-white text-xs rounded hover:opacity-80 transition-opacity"
        >
          <LogIn size={12} />
          Login with Zerodha
        </a>
      )}

      {/* App logout */}
      <button
        onClick={handleLogout}
        title="Logout"
        className="ml-2 p-1.5 text-terminal-muted hover:text-terminal-red transition-colors"
      >
        <LogOut size={13} />
      </button>
    </div>
  );
}

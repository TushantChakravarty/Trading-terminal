import { useEffect } from "react";
import { TopBar } from "./components/Layout/TopBar";
import { Watchlist } from "./components/Watchlist/Watchlist";
import { CandleChart } from "./components/Chart/CandleChart";
import { OptionsChain } from "./components/OptionsChain/OptionsChain";
import { NewsFeed } from "./components/NewsFeed/NewsFeed";
import { SignalPanel } from "./components/Signals/SignalPanel";
import { LoginPage } from "./components/Login/LoginPage";
import { useWebSocket } from "./hooks/useWebSocket";
import { useAuthStatus } from "./hooks/useAuthStatus";
import { useTerminalStore } from "./store";
import { SERVER } from "./lib/server";

// ── Desktop top tab row ───────────────────────────────────────────────────────

function PanelTabs() {
  const { activePanel, setActivePanel } = useTerminalStore();
  const tabs = [
    { id: "chart"   as const, label: "CHART" },
    { id: "options" as const, label: "OPTIONS" },
    { id: "signals" as const, label: "SIGNALS" },
    { id: "news"    as const, label: "NEWS" },
  ];
  return (
    <div className="hidden md:flex border-b border-terminal-border bg-terminal-header shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActivePanel(tab.id)}
          className={`px-4 py-2 text-xs tracking-widest transition-colors ${
            activePanel === tab.id
              ? "text-terminal-blue border-b-2 border-terminal-blue"
              : "text-terminal-dim hover:text-terminal-text"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Mobile bottom navigation ──────────────────────────────────────────────────

function MobileNav() {
  const { activePanel, setActivePanel } = useTerminalStore();
  const tabs = [
    { id: "watchlist" as const, label: "WATCH" },
    { id: "chart"     as const, label: "CHART" },
    { id: "options"   as const, label: "OPTIONS" },
    { id: "signals"   as const, label: "SIGNALS" },
    { id: "news"      as const, label: "NEWS" },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 flex bg-terminal-header border-t border-terminal-border z-30">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setActivePanel(id)}
          className={`flex-1 py-2.5 text-[9px] tracking-widest font-medium transition-colors ${
            activePanel === id
              ? "text-terminal-blue border-t-2 border-terminal-blue -mt-px"
              : "text-terminal-dim"
          }`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

// ── Zerodha login banner ──────────────────────────────────────────────────────

function AuthBanner() {
  const { isAuthenticated } = useTerminalStore();
  if (isAuthenticated) return null;
  return (
    <div className="absolute inset-x-0 top-10 z-20 flex items-center justify-center bg-terminal-bg/90 border-b border-terminal-border py-2 px-3">
      <div className="flex items-center gap-2 text-xs text-terminal-dim flex-wrap justify-center">
        <span className="hidden sm:inline">⚡ Login with Zerodha to enable live data, options chain & signals</span>
        <span className="sm:hidden text-[10px]">⚡ Login for live data</span>
        <a
          href={`${SERVER}/api/auth/login`}
          className="px-3 py-1 bg-terminal-blue text-white rounded hover:opacity-80 transition-opacity whitespace-nowrap"
        >
          Login →
        </a>
      </div>
    </div>
  );
}

// ── Main terminal (only mounts after app login) ───────────────────────────────

function Terminal() {
  useAuthStatus();
  const { status, subscribe } = useWebSocket();
  const { watchlist, additionalTokens } = useTerminalStore();
  const activePanel = useTerminalStore((s) => s.activePanel);

  // Always keep the 4 main Indian indices subscribed for TopBar + Watchlist
  const CORE_TOKENS = [256265, 260105, 265, 264969]; // NIFTY, BANKNIFTY, SENSEX, VIX

  useEffect(() => {
    if (status === "connected") {
      const tokens = [...new Set([...CORE_TOKENS, ...watchlist.map((w) => w.token), ...additionalTokens])];
      subscribe(tokens);
    }
  }, [status, watchlist.length, additionalTokens.join(",")]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth")) window.history.replaceState({}, "", "/");
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] bg-terminal-bg font-mono text-terminal-text overflow-hidden relative">
      <AuthBanner />
      <TopBar />

      <div className="flex flex-1 min-h-0">
        {/* Watchlist sidebar — desktop only */}
        <div className="hidden md:flex">
          <Watchlist />
        </div>

        {/* Right panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <PanelTabs />

          {/* Content — extra bottom padding on mobile for the fixed nav bar */}
          <div className="flex-1 min-h-0 overflow-hidden pb-12 md:pb-0">
            {activePanel === "watchlist" && (
              <div className="md:hidden h-full overflow-y-auto">
                <Watchlist />
              </div>
            )}
            {activePanel === "chart"   && <CandleChart />}
            {activePanel === "options" && <OptionsChain />}
            {activePanel === "signals" && <SignalPanel />}
            {activePanel === "news"    && <NewsFeed />}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />

      {/* WS status dot — desktop only */}
      <div className="hidden md:flex absolute bottom-2 right-2 items-center gap-1.5 text-[10px] text-terminal-muted">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === "connected"   ? "bg-terminal-green" :
            status === "connecting"  ? "bg-terminal-yellow animate-pulse" :
                                       "bg-terminal-red"
          }`}
        />
        {status}
      </div>
    </div>
  );
}

export default function App() {
  const appToken = useTerminalStore((s) => s.appToken);
  return appToken ? <Terminal /> : <LoginPage />;
}

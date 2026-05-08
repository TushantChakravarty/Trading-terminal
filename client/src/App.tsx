import { useEffect } from "react";
import { TopBar } from "./components/Layout/TopBar";
import { Watchlist } from "./components/Watchlist/Watchlist";
import { CandleChart } from "./components/Chart/CandleChart";
import { OptionsChain } from "./components/OptionsChain/OptionsChain";
import { NewsFeed } from "./components/NewsFeed/NewsFeed";
import { SignalPanel } from "./components/Signals/SignalPanel";
import { useWebSocket } from "./hooks/useWebSocket";
import { useAuthStatus } from "./hooks/useAuthStatus";
import { useTerminalStore } from "./store";

function PanelTabs() {
  const { activePanel, setActivePanel } = useTerminalStore();

  const tabs = [
    { id: "chart"   as const, label: "CHART" },
    { id: "options" as const, label: "OPTIONS" },
    { id: "signals" as const, label: "SIGNALS" },
    { id: "news"    as const, label: "NEWS" },
  ];

  return (
    <div className="flex border-b border-terminal-border bg-terminal-header shrink-0">
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

function AuthBanner() {
  const { isAuthenticated } = useTerminalStore();
  if (isAuthenticated) return null;

  return (
    <div className="absolute inset-x-0 top-10 z-20 flex items-center justify-center bg-terminal-bg/90 border-b border-terminal-border py-2">
      <div className="flex items-center gap-3 text-xs text-terminal-dim">
        <span>⚡ Login with Zerodha to enable live data, options chain & signals</span>
        <a
          href="/api/auth/login"
          className="px-3 py-1 bg-terminal-blue text-white rounded hover:opacity-80 transition-opacity"
        >
          Login →
        </a>
      </div>
    </div>
  );
}

export default function App() {
  useAuthStatus();
  const { status, subscribe } = useWebSocket();
  const { watchlist } = useTerminalStore();
  const activePanel = useTerminalStore((s) => s.activePanel);

  // Subscribe watchlist tokens on connect
  useEffect(() => {
    if (status === "connected") {
      const tokens = watchlist.map((w) => w.token);
      subscribe(tokens);
    }
  }, [status, watchlist.length]);

  // Handle auth redirect params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth) {
      window.history.replaceState({}, "", "/");
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-terminal-bg font-mono text-terminal-text overflow-hidden relative">
      <AuthBanner />
      <TopBar />

      <div className="flex flex-1 min-h-0">
        {/* Left: Watchlist */}
        <Watchlist />

        {/* Main area */}
        <div className="flex flex-col flex-1 min-w-0">
          <PanelTabs />

          <div className="flex-1 min-h-0 overflow-hidden">
            {activePanel === "chart"   && <CandleChart />}
            {activePanel === "options" && <OptionsChain />}
            {activePanel === "signals" && <SignalPanel />}
            {activePanel === "news"    && <NewsFeed />}
          </div>
        </div>
      </div>

      {/* WS status dot */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 text-[10px] text-terminal-muted">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === "connected"
              ? "bg-terminal-green"
              : status === "connecting"
              ? "bg-terminal-yellow animate-pulse"
              : "bg-terminal-red"
          }`}
        />
        {status}
      </div>
    </div>
  );
}

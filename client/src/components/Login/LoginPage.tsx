import { useState, FormEvent } from "react";
import axios from "axios";
import { useTerminalStore } from "../../store";

export function LoginPage() {
  const setAppToken = useTerminalStore((s) => s.setAppToken);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/app-login", { username, password });
      setAppToken(data.token);
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-terminal-bg font-mono text-terminal-text">
      <div className="w-80 border border-terminal-border bg-terminal-panel p-8">
        <div className="mb-6 text-center">
          <div className="text-terminal-blue text-xs tracking-widest mb-1">TRADING TERMINAL</div>
          <div className="text-terminal-dim text-[10px] tracking-widest">NSE · BSE · DERIVATIVES</div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-terminal-dim text-[10px] tracking-widest">USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              className="bg-terminal-bg border border-terminal-border px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-terminal-blue"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-terminal-dim text-[10px] tracking-widest">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="bg-terminal-bg border border-terminal-border px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-terminal-blue"
            />
          </div>

          {error && (
            <div className="text-terminal-red text-[10px] tracking-wide">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="mt-2 py-2 text-xs tracking-widest bg-terminal-blue text-white hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "AUTHENTICATING..." : "LOGIN →"}
          </button>
        </form>
      </div>
    </div>
  );
}

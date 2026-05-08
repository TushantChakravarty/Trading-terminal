import WebSocket from "ws";
import { KiteTicker } from "kiteconnect";
import { config } from "../config";
import { kiteService } from "./kite";

class TickerService {
  private ticker: any = null;
  private clients: Set<WebSocket> = new Set();
  private subscribedTokens: Set<number> = new Set();

  addClient(ws: WebSocket) {
    this.clients.add(ws);
    ws.on("close", () => this.clients.delete(ws));
    ws.on("message", (raw) => this.handleClientMessage(ws, raw.toString()));

    ws.send(JSON.stringify({ type: "subscribed_tokens", data: [...this.subscribedTokens] }));

    // If a Kite session is already active (restored from DB or from a prior login),
    // tell this client immediately so it doesn't wait for the 30s REST poll
    if (kiteService.isAuthenticated()) {
      ws.send(JSON.stringify({ type: "authenticated", data: { profile: kiteService.getProfile() } }));
    }
  }

  private handleClientMessage(ws: WebSocket, raw: string) {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === "subscribe" && Array.isArray(msg.tokens)) {
        this.subscribe(msg.tokens);
      } else if (msg.type === "unsubscribe" && Array.isArray(msg.tokens)) {
        this.unsubscribe(msg.tokens);
      }
    } catch {
      // ignore malformed messages
    }
  }

  connect() {
    if (this.ticker) return;

    const accessToken = kiteService.getAccessToken();
    if (!accessToken) return;

    this.ticker = new KiteTicker({
      api_key: config.kite.apiKey,
      access_token: accessToken,
    });

    this.ticker.connect();

    this.ticker.on("ticks", (ticks: any[]) => {
      const msg = JSON.stringify({ type: "ticks", data: ticks });
      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(msg);
        }
      });
    });

    this.ticker.on("connect", () => {
      console.log("[ticker] connected");
      if (this.subscribedTokens.size > 0) {
        this.ticker.subscribe([...this.subscribedTokens]);
        this.ticker.setMode(this.ticker.modeFull, [...this.subscribedTokens]);
      }
    });

    this.ticker.on("disconnect", (err: any) => {
      console.log("[ticker] disconnected", err?.message);
    });

    this.ticker.on("error", (err: any) => {
      console.error("[ticker] error", err);
    });

    this.ticker.on("reconnecting", (ms: number, attempt: number) => {
      console.log(`[ticker] reconnecting in ${ms}ms, attempt ${attempt}`);
    });
  }

  subscribe(tokens: number[]) {
    tokens.forEach((t) => this.subscribedTokens.add(t));
    if (this.ticker?.connected()) {
      this.ticker.subscribe(tokens);
      this.ticker.setMode(this.ticker.modeFull, tokens);
    }
  }

  unsubscribe(tokens: number[]) {
    tokens.forEach((t) => this.subscribedTokens.delete(t));
    if (this.ticker?.connected()) {
      this.ticker.unsubscribe(tokens);
    }
  }

  broadcast(data: any) {
    const msg = JSON.stringify(data);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
  }
}

export const tickerService = new TickerService();

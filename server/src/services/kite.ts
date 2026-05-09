import { KiteConnect } from "kiteconnect";
import { config } from "../config";
import { Session } from "../db/models/Session";

function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

class KiteService {
  private kc: any = null;
  private accessToken: string | null = null;
  private userProfile: any = null;

  getKC() {
    if (!this.kc) {
      this.kc = new KiteConnect({ api_key: config.kite.apiKey });
    }
    return this.kc;
  }

  // Called once after DB connects — restores today's session if it exists
  async restoreSession() {
    const saved = await Session.findOne({ date: todayIST() }).sort({ createdAt: -1 });
    if (!saved) return;

    this.accessToken = saved.accessToken;
    this.userProfile  = saved.profile;
    this.getKC().setAccessToken(saved.accessToken);
    console.log("[kite] session restored —", saved.profile?.user_name ?? "unknown");
  }

  getLoginURL(): string {
    return this.getKC().getLoginURL();
  }

  async generateSession(requestToken: string) {
    const kc      = this.getKC();
    const session = await kc.generateSession(requestToken, config.kite.apiSecret);

    this.accessToken = session.access_token;
    kc.setAccessToken(this.accessToken);
    this.userProfile = await kc.getProfile();

    // Upsert — one document per day
    await Session.findOneAndUpdate(
      { date: todayIST() },
      { accessToken: this.accessToken, date: todayIST(), profile: this.userProfile },
      { upsert: true, new: true }
    );

    console.log("[kite] session saved to MongoDB");
    return session;
  }

  clearSession() {
    this.accessToken = null;
    this.userProfile = null;
    if (this.kc) this.kc.setAccessToken(null);
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getProfile() {
    return this.userProfile;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async getQuotes(symbols: string[]): Promise<any> {
    return this.getKC().getQuote(symbols);
  }

  async getOHLC(symbols: string[]): Promise<any> {
    return this.getKC().getOHLC(symbols);
  }

  async getHistoricalData(
    instrumentToken: number,
    interval: string,
    from: Date,
    to: Date
  ): Promise<any> {
    return this.getKC().getHistoricalData(instrumentToken, interval, from, to, false);
  }

  private instrumentsCache: Map<string, { data: any[]; at: number }> = new Map();
  private readonly INSTRUMENTS_TTL = 60 * 60 * 1000; // 60 minutes

  async getInstruments(exchange: string): Promise<any[]> {
    const cached = this.instrumentsCache.get(exchange);
    if (cached && Date.now() - cached.at < this.INSTRUMENTS_TTL) {
      return cached.data;
    }
    console.log(`[kite] fetching instruments for ${exchange}...`);
    const data = await this.getKC().getInstruments([exchange]);
    this.instrumentsCache.set(exchange, { data, at: Date.now() });
    console.log(`[kite] cached ${data.length} ${exchange} instruments`);
    return data;
  }

  clearInstrumentsCache(exchange?: string) {
    if (exchange) this.instrumentsCache.delete(exchange);
    else this.instrumentsCache.clear();
  }
}

export const kiteService = new KiteService();

export function isKiteAuthError(err: any): boolean {
  return (
    err?.error_type === "TokenException" ||
    (typeof err?.message === "string" &&
      (err.message.includes("access_token") || err.message.includes("api_key")))
  );
}

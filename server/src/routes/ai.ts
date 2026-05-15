import { Router, Request, Response } from "express";
import { kiteService } from "../services/kite";
import { getNews } from "../services/news";
import { config } from "../config";
import { Suggestion } from "../db/models/Suggestion";

const router = Router();

// ── Groq helper ───────────────────────────────────────────────────────────────

async function callGroq(systemMsg: string, userMsg: string): Promise<string> {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.groqModel,
      messages: [
        { role: "system", content: systemMsg },
        { role: "user",   content: userMsg   },
      ],
      max_tokens: 1500,
      temperature: 0.4,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Groq ${resp.status}: ${body.slice(0, 300)}`);
  }

  const json = (await resp.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (content) return (content as string).trim();
  throw new Error("Unexpected Groq response: " + JSON.stringify(json).slice(0, 200));
}

// Strip markdown fences, extract JSON, repair if truncated
function extractJson(raw: string): any {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const start = stripped.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in response");

  // Try last closing brace first (clean case)
  const end = stripped.lastIndexOf("}");
  if (end > start) {
    try { return JSON.parse(stripped.slice(start, end + 1)); } catch { /* fall through to repair */ }
  }

  // Repair truncated JSON: close all open brackets in reverse order
  let fragment = stripped.slice(start);
  const stack: string[] = [];
  let inString = false;
  let escape   = false;

  for (const ch of fragment) {
    if (escape)            { escape = false; continue; }
    if (ch === "\\")       { escape = true;  continue; }
    if (ch === '"')        { inString = !inString; continue; }
    if (inString)          { continue; }
    if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    if (ch === "}" || ch === "]") stack.pop();
  }

  // Strip trailing incomplete key/value (e.g. dangling comma or partial string)
  fragment = fragment.replace(/,\s*$/, "").replace(/,\s*[\w"]*$/, "");
  const closing = stack.reverse().join("");
  try {
    return JSON.parse(fragment + closing);
  } catch (e: any) {
    throw new Error("JSON parse failed after repair attempt: " + e.message);
  }
}

// ── Per-symbol suggestion (chart AI button) ───────────────────────────────────

interface AiCacheEntry { text: string; at: number }
const aiCache = new Map<string, AiCacheEntry>();
const AI_CACHE_TTL = 5 * 60_000;

router.get("/suggest", async (req: Request, res: Response) => {
  const { symbol, token } = req.query as { symbol?: string; token?: string };
  if (!symbol || !token) return res.status(400).json({ error: "symbol and token are required" });
  if (!config.groqApiKey) return res.status(503).json({ error: "GROQ_API_KEY not configured" });

  const cacheKey = `${symbol}-${token}`;
  const cached = aiCache.get(cacheKey);
  if (cached && Date.now() - cached.at < AI_CACHE_TTL) {
    return res.json({ analysis: cached.text, cached: true });
  }

  try {
    const symbolName = symbol.split(":")[1] ?? symbol;

    let quoteStr = "Unavailable";
    try {
      const quotes = await kiteService.getQuotes([symbol]);
      const q = quotes[symbol] ?? (Object.values(quotes)[0] as any);
      if (q) {
        const close = q.ohlc?.close ?? 0;
        const chg   = close ? (((q.last_price - close) / close) * 100).toFixed(2) : "N/A";
        quoteStr = `LTP ₹${q.last_price}, Change ${chg}%`;
        if (q.ohlc) quoteStr += `, O ₹${q.ohlc.open} H ₹${q.ohlc.high} L ₹${q.ohlc.low} C ₹${q.ohlc.close}`;
        if (q.volume) quoteStr += `, Vol ${q.volume.toLocaleString()}`;
        if (q.oi)     quoteStr += `, OI ${q.oi.toLocaleString()}`;
      }
    } catch { /* skip */ }

    const allNews = await getNews();
    const lowerName = symbolName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const relevant = allNews
      .filter((n) => {
        const t = (n.title + " " + n.snippet).toLowerCase();
        return t.includes(lowerName) || n.impact === "HIGH" || ["MARKETS","MACRO","GLOBAL","RBI"].includes(n.category);
      })
      .slice(0, 6)
      .map((n) => `[${n.impact}][${n.category}] ${n.title}`);

    const systemMsg =
      "You are a concise Indian equity trading analyst. " +
      "Answer only from the data provided. Be brief and factual. " +
      "Respond in exactly the format requested, no extra commentary.";

    const userMsg =
      `Analyze ${symbolName} and give a short trading view.\n\n` +
      `Market Data: ${quoteStr}\n\n` +
      `Recent News:\n${relevant.join("\n") || "None"}\n\n` +
      `Respond in exactly this format:\n` +
      `BIAS: BUY / SELL / HOLD\n` +
      `KEY LEVELS: support ₹xxx, resistance ₹xxx\n` +
      `RISK: one sentence\n` +
      `OUTLOOK (1-3 days): one sentence\n` +
      `WATCH FOR: one trigger event`;

    const analysis = await callGroq(systemMsg, userMsg);
    aiCache.set(cacheKey, { text: analysis, at: Date.now() });
    res.json({ analysis, cached: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Market pulse (AI suggestions tab) ────────────────────────────────────────

let pulseCache: { doc: any; at: number } | null = null;
const PULSE_TTL = 10 * 60_000; // 10 min

router.get("/market-pulse", async (req: Request, res: Response) => {
  if (!config.groqApiKey) return res.status(503).json({ error: "GROQ_API_KEY not configured" });

  if (pulseCache && Date.now() - pulseCache.at < PULSE_TTL) {
    return res.json(pulseCache.doc);
  }

  try {
    // ── Context: NIFTY/BANKNIFTY quotes ─────────────────────────────────────
    let marketCtx = "";
    try {
      const q = await kiteService.getQuotes(["NSE:NIFTY 50", "NSE:NIFTY BANK"]);
      for (const [sym, data] of Object.entries(q) as any) {
        const d = data as any;
        const chg = d.ohlc?.close ? (((d.last_price - d.ohlc.close) / d.ohlc.close) * 100).toFixed(2) : "N/A";
        marketCtx += `${sym}: ₹${d.last_price} (${chg}%)\n`;
      }
    } catch { /* skip */ }

    // ── Context: top news ────────────────────────────────────────────────────
    const news = await getNews();
    const topNews = news.slice(0, 15).map((n) => `[${n.impact}][${n.category}] ${n.title}`).join("\n");

    // ── Context: past high-rated suggestions ─────────────────────────────────
    let feedbackCtx = "";
    try {
      const past = await Suggestion.find({ "ratings.0": { $exists: true } })
        .sort({ generatedAt: -1 })
        .limit(5)
        .lean();

      const goodExamples: string[] = [];
      const badExamples:  string[] = [];

      for (const doc of past) {
        for (const r of doc.ratings as any[]) {
          const idea = findIdea(doc.pulse, r.ideaId);
          if (!idea) continue;
          const line = `"${idea.symbol ?? idea.instrument}" ${idea.bias} → rated ${r.rating}/5`;
          if (r.rating >= 4) goodExamples.push(line);
          if (r.rating <= 2) badExamples.push(line);
        }
      }

      if (goodExamples.length) feedbackCtx += `\nHighly-rated past calls (use as style reference):\n${goodExamples.join("\n")}`;
      if (badExamples.length)  feedbackCtx += `\nLow-rated past calls (avoid similar patterns):\n${badExamples.join("\n")}`;
    } catch { /* skip */ }

    // ── Prompt ───────────────────────────────────────────────────────────────
    const systemMsg =
      "You are an expert Indian equity and derivatives trading analyst. " +
      "Generate a structured market pulse with actionable trade ideas. " +
      "Return ONLY valid JSON, no markdown, no commentary.";

    const userMsg =
      `Today's market data:\n${marketCtx || "Not available"}\n\n` +
      `Latest news:\n${topNews}\n` +
      feedbackCtx + "\n\n" +
      `Return a JSON object with exactly these fields:\n` +
      `{\n` +
      `  "market_bias": "BULLISH" | "BEARISH" | "NEUTRAL",\n` +
      `  "summary": "2-sentence market overview",\n` +
      `  "key_themes": ["theme1", "theme2", "theme3"],\n` +
      `  "bullish_sectors": ["sector1", "sector2", "sector3"],\n` +
      `  "bearish_sectors": ["sector1", "sector2"],\n` +
      `  "index_ideas": [\n` +
      `    { "id": "i0", "index": "NIFTY 50", "instrument": "NIFTY FUT", "bias": "BUY"|"SELL",\n` +
      `      "entry": "₹xxx-yyy", "target": "₹zzz", "stop_loss": "₹aaa",\n` +
      `      "reason": "one sentence" }\n` +
      `  ],\n` +
      `  "stock_ideas": [\n` +
      `    { "id": "s0", "symbol": "SYMBOL", "exchange": "NSE", "bias": "BUY"|"SELL",\n` +
      `      "entry": "₹xxx-yyy", "target": "₹zzz", "stop_loss": "₹aaa",\n` +
      `      "reason": "one sentence" }\n` +
      `  ],\n` +
      `  "options_ideas": [\n` +
      `    { "id": "o0", "instrument": "NIFTY 25000 CE", "expiry": "weekly"|"monthly",\n` +
      `      "bias": "BUY"|"SELL", "entry": "₹xxx-yyy", "target": "₹zzz", "stop_loss": "₹aaa",\n` +
      `      "reason": "one sentence" }\n` +
      `  ]\n` +
      `}\n` +
      `Include 2 index_ideas (NIFTY 50 and BANKNIFTY), 3 stock_ideas, and 2 options_ideas.`;

    const raw   = await callGroq(systemMsg, userMsg);
    const pulse = extractJson(raw);

    // Save to MongoDB
    const doc = await Suggestion.create({ pulse });
    const result = { ...pulse, _id: doc._id.toString(), generatedAt: doc.generatedAt };

    pulseCache = { doc: result, at: Date.now() };
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/rate  { suggestionId, ideaId, rating }
router.post("/rate", async (req: Request, res: Response) => {
  const { suggestionId, ideaId, rating } = req.body as {
    suggestionId?: string;
    ideaId?: string;
    rating?: number;
  };

  if (!suggestionId || !ideaId || !rating) {
    return res.status(400).json({ error: "suggestionId, ideaId and rating required" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be 1–5" });
  }

  try {
    // Upsert: replace existing rating for this ideaId if present
    await Suggestion.updateOne(
      { _id: suggestionId },
      { $pull: { ratings: { ideaId } } }
    );
    await Suggestion.updateOne(
      { _id: suggestionId },
      { $push: { ratings: { ideaId, rating, ratedAt: new Date() } } }
    );

    // Invalidate pulse cache so next fetch rebuilds with new feedback
    pulseCache = null;

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────

function findIdea(pulse: any, ideaId: string) {
  if (!pulse) return null;
  const idx = parseInt(ideaId.slice(1));
  if (ideaId.startsWith("i")) return pulse.index_ideas?.[idx]   ?? null;
  if (ideaId.startsWith("s")) return pulse.stock_ideas?.[idx]   ?? null;
  if (ideaId.startsWith("o")) return pulse.options_ideas?.[idx] ?? null;
  return null;
}

export default router;

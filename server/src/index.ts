import express from "express";
import cors from "cors";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { config } from "./config";
import { connectDB } from "./db/connection";
import { kiteService } from "./services/kite";
import { tickerService } from "./services/ticker";
import { requireAppAuth, initAppSession } from "./middleware/appAuth";
import authRouter from "./routes/auth";
import quotesRouter from "./routes/quotes";
import optionsRouter from "./routes/options";
import newsRouter from "./routes/news";
import signalsRouter from "./routes/signals";

const app = express();

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://trading-terminal.netlify.app",
  ...config.clientUrl.split(",").map((s) => s.trim()).filter(Boolean),
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
    else cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Public auth routes (browser redirects that can't carry x-app-token)
const PUBLIC_PATHS = new Set(["/auth/app-login", "/auth/login", "/auth/callback"]);

app.use("/api", (req, res, next) => {
  if (PUBLIC_PATHS.has(req.path)) return next();
  requireAppAuth(req, res, next);
});

app.use("/api/auth",    authRouter);
app.use("/api/quotes",  quotesRouter);
app.use("/api/options", optionsRouter);
app.use("/api/news",    newsRouter);
app.use("/api/signals", signalsRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws: WebSocket) => {
  console.log("[ws] client connected, total:", wss.clients.size);
  tickerService.addClient(ws);
});

async function start() {
  // 1. Connect MongoDB
  await connectDB();

  // 2. Init app session token in DB
  await initAppSession();

  // 3. Restore today's Kite session (if any)
  await kiteService.restoreSession();

  // 3. If already authenticated, reconnect the ticker
  if (kiteService.isAuthenticated()) {
    tickerService.connect();
    tickerService.subscribe([256265, 260105, 265, 264969]); // NIFTY, BANKNIFTY, SENSEX, VIX
    console.log("[ticker] auto-started with restored session");
  }

  // 4. Start HTTP + WS server
  server.listen(config.port, () => {
    console.log(`[server] running on http://localhost:${config.port}`);
    console.log(`[server] WebSocket on ws://localhost:${config.port}/ws`);
    console.log(config.kite.apiKey ? "[kite] API key loaded" : "[kite] WARNING: no API key in .env");
  });
}

start();

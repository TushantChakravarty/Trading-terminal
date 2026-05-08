import { Router, Request, Response } from "express";
import { kiteService } from "../services/kite";
import { tickerService } from "../services/ticker";
import { config } from "../config";
import { makeAppToken, saveAppSession } from "../middleware/appAuth";

const CLIENT = config.clientUrl;

const router = Router();

// Terminal app login (checked against APP_USERNAME / APP_PASSWORD in .env)
router.post("/app-login", async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (username === config.app.username && password === config.app.password) {
    const token = makeAppToken(username, password);
    await saveAppSession();
    return res.json({ token });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

// Step 1: Redirect browser to Zerodha login
router.get("/login", (_req: Request, res: Response) => {
  const url = kiteService.getLoginURL();
  res.redirect(url);
});

// Step 2: Zerodha redirects here after login with ?request_token=xxx
router.get("/callback", async (req: Request, res: Response) => {
  const { request_token, status } = req.query as Record<string, string>;

  if (status !== "success" || !request_token) {
    return res.redirect(`${CLIENT}?auth=failed`);
  }

  try {
    await kiteService.generateSession(request_token);
    tickerService.connect();

    // Subscribe default indices
    const DEFAULT_TOKENS = [
      256265,  // NIFTY 50
      260105,  // NIFTY BANK
      265,     // SENSEX
      264969,  // INDIA VIX
    ];
    tickerService.subscribe(DEFAULT_TOKENS);

    // Notify all connected browser clients immediately
    tickerService.broadcast({
      type: "authenticated",
      data: { profile: kiteService.getProfile() },
    });

    res.redirect(`${CLIENT}?auth=success`);
  } catch (err: any) {
    console.error("[auth] session error:", err.message);
    res.redirect(`${CLIENT}?auth=failed`);
  }
});

router.get("/status", (_req: Request, res: Response) => {
  res.json({
    authenticated: kiteService.isAuthenticated(),
    profile: kiteService.getProfile(),
  });
});

export default router;

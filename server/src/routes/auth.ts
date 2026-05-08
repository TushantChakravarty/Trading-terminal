import { Router, Request, Response } from "express";
import { kiteService } from "../services/kite";
import { tickerService } from "../services/ticker";

const router = Router();

// Step 1: Redirect browser to Zerodha login
router.get("/login", (_req: Request, res: Response) => {
  const url = kiteService.getLoginURL();
  res.redirect(url);
});

// Step 2: Zerodha redirects here after login with ?request_token=xxx
router.get("/callback", async (req: Request, res: Response) => {
  const { request_token, status } = req.query as Record<string, string>;

  if (status !== "success" || !request_token) {
    return res.redirect("http://localhost:5173?auth=failed");
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

    res.redirect("http://localhost:5173?auth=success");
  } catch (err: any) {
    console.error("[auth] session error:", err.message);
    res.redirect("http://localhost:5173?auth=failed");
  }
});

router.get("/status", (_req: Request, res: Response) => {
  res.json({
    authenticated: kiteService.isAuthenticated(),
    profile: kiteService.getProfile(),
  });
});

export default router;

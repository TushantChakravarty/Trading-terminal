import { Router, Request, Response } from "express";
import { computeThemes } from "../services/themes";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const themes = await computeThemes();
    res.json(themes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

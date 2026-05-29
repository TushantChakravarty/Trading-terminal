import { Router, Request, Response } from "express";
import { computeMovers } from "../services/movers";

const router = Router();

// GET /api/movers?minReturn=3
router.get("/", async (req: Request, res: Response) => {
  const minReturn = parseFloat((req.query.minReturn as string) || "3");
  try {
    const result = await computeMovers(isNaN(minReturn) ? 3 : minReturn);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

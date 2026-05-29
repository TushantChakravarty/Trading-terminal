import { Router, Request, Response } from "express";
import { computeHotSectors } from "../services/sectors";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const sectors = await computeHotSectors();
    res.json(sectors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

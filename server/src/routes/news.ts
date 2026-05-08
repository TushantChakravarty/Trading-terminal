import { Router, Request, Response } from "express";
import { getNews } from "../services/news";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const items = await getNews();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

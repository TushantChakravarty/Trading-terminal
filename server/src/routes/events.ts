import { Router, Request, Response } from "express";
import { getEvents } from "../services/events";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  try {
    const events = getEvents();
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

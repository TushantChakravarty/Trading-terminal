import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "../config";
import { AppSession } from "../db/models/AppSession";

export function makeAppToken(username: string, password: string): string {
  return crypto
    .createHash("sha256")
    .update(`${username}:${password}:trading-terminal`)
    .digest("hex");
}

// In-memory cache — populated by initAppSession() at startup and updated on login
let _validToken: string | null = null;

// Called once after DB connects — loads (or creates) the session token in MongoDB
export async function initAppSession(): Promise<void> {
  const expected = makeAppToken(config.app.username, config.app.password);
  await AppSession.findOneAndUpdate(
    {},
    { token: expected },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  _validToken = expected;
  console.log("[app-auth] session token ready");
}

// Called after a successful app login to refresh the DB record
export async function saveAppSession(): Promise<void> {
  const token = makeAppToken(config.app.username, config.app.password);
  await AppSession.findOneAndUpdate({}, { token }, { upsert: true, new: true });
  _validToken = token;
}

export function requireAppAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-app-token"];
  if (_validToken && token === _validToken) return next();
  res.status(401).json({ error: "Unauthorized" });
}

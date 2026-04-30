import type { Request, Response } from "express";
import { AppDataSource } from "../config/database";

export class HealthController {
  liveness = (_req: Request, res: Response) => {
    res.json({ ok: true, uptime: process.uptime() });
  };

  readiness = async (_req: Request, res: Response) => {
    if (!AppDataSource.isInitialized) {
      return res.status(503).json({ ok: false, reason: "database_not_initialized" });
    }
    try {
      await AppDataSource.query("SELECT 1");
      return res.json({ ok: true });
    } catch {
      return res.status(503).json({ ok: false, reason: "database_unreachable" });
    }
  };
}

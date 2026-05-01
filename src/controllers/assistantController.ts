import type { NextFunction, Request, Response } from "express";
import { AssistantService } from "../services/assistantService";
import { sendAppError } from "./sendAppError";

export class AssistantController {
  private service = new AssistantService();

  recommend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth?.sub) return res.status(401).json({ message: "Unauthorized" });
      const result = await this.service.recommend({
        userId: req.auth.sub,
        prompt: typeof req.body?.prompt === "string" ? req.body.prompt : undefined,
        language: typeof req.body?.language === "string" ? req.body.language : undefined,
      });
      res.json(result);
    } catch (err) {
      if (!sendAppError(err, res)) next(err);
    }
  };
}

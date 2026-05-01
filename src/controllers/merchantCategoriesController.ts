import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { parseIdParam } from "../common/parseIdParam";
import { sendAppError } from "./sendAppError";
import { MerchantCategoriesService } from "../services/merchantCategoriesService";

const createSchema = z.object({
  code: z.string().min(2).max(32),
  displayName: z.string().min(1).max(128),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  code: z.string().min(2).max(32).optional(),
  displayName: z.string().min(1).max(128).optional(),
  isActive: z.boolean().optional(),
});

export class MerchantCategoriesController {
  private service = new MerchantCategoriesService();

  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.findAll());
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createSchema.parse(req.body);
      res.status(201).json(await this.service.create(body));
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseIdParam(req.params.id);
      const body = updateSchema.parse(req.body);
      res.json(await this.service.update(id, body));
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  private sendKnownError(err: unknown, res: Response): boolean {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation error", issues: err.flatten() });
      return true;
    }
    return sendAppError(err, res);
  }
}

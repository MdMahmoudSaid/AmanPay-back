import type { Request, Response, NextFunction } from "express";
import { parseIdParam } from "../common/parseIdParam";
import { UnblockRequestService } from "../services/unblockRequestService";
import { sendAppError } from "./sendAppError";

export class UnblockRequestController {
  private service = new UnblockRequestService();

  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.findAll());
    } catch (err) {
      if (!sendAppError(err, res)) next(err);
    }
  };

  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseIdParam(req.params.id);
      const row = await this.service.findById(id);
      if (!row) {
        return res.status(404).json({ message: "Unblock request not found" });
      }
      res.json(row);
    } catch (err) {
      if (!sendAppError(err, res)) next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = await this.service.create(req.body as Record<string, unknown>);
      res.status(201).json(created);
    } catch (err) {
      if (!sendAppError(err, res)) next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseIdParam(req.params.id);
      const updated = await this.service.update(id, req.body as Record<string, unknown>);
      res.json(updated);
    } catch (err) {
      if (!sendAppError(err, res)) next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseIdParam(req.params.id);
      await this.service.delete(id);
      res.status(204).send();
    } catch (err) {
      if (!sendAppError(err, res)) next(err);
    }
  };
}

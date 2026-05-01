import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { parseIdParam } from "../common/parseIdParam";
import { UserRole, UserStatus } from "../entities/User";
import { UsersService } from "../services/usersService";
import { sendAppError } from "./sendAppError";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(255),
  phone: z.string().max(50).optional().nullable(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  merchantCategory: z.string().max(32).optional().nullable(),
});

const patchSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).nullable().optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  merchantCategory: z.string().max(32).nullable().optional(),
  password: z.string().min(8).optional(),
});

export class UsersController {
  private service = new UsersService();

  getAll = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.service.findAll());
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  getOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseIdParam(req.params.id);
      const row = await this.service.findById(id);
      if (!row) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(row);
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createSchema.parse(req.body);
      const created = await this.service.create(body);
      res.status(201).json(created);
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseIdParam(req.params.id);
      const body = patchSchema.parse(req.body);
      const updated = await this.service.update(id, body);
      res.json(updated);
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseIdParam(req.params.id);
      await this.service.delete(id);
      res.status(204).send();
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

import type { Response } from "express";
import { AppError } from "../common/errors";

export function sendAppError(err: unknown, res: Response): boolean {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message, code: err.code });
    return true;
  }
  return false;
}

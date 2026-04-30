import type { Request, Response, NextFunction } from "express";
import type { Logger } from "pino";
import { AppError } from "../common/errors";
import { loadEnv } from "../config/env";

export function errorHandler(logger: Logger) {
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    let nodeEnv: string;
    try {
      nodeEnv = loadEnv().NODE_ENV;
    } catch {
      nodeEnv = "development";
    }

    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message, code: err.code });
    }
    logger.error({ err, requestId: req.requestId }, "Unhandled error");
    const body: Record<string, unknown> = { message: "Internal server error" };
    if (nodeEnv === "development" && err instanceof Error) {
      body.detail = err.message;
    }
    res.status(500).json(body);
  };
}

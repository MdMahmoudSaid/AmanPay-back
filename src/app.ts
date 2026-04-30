import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pino from "pino";
import pinoHttp from "pino-http";
import { loadEnv } from "./config/env";
import { requestIdMiddleware } from "./middlewares/requestIdMiddleware";
import { errorHandler } from "./middlewares/errorMiddleware";
import apiRouter from "./routes";

export function createApp() {
  const env = loadEnv();
  const logger = pino({
    level: env.NODE_ENV === "test" ? "silent" : env.NODE_ENV === "production" ? "info" : "debug",
  });

  const app = express();

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cors());
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({ requestId: req.requestId }),
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/favicon.ico", (_req, res) => res.status(204).send());

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/auth", authLimiter);

  app.use("/api", apiRouter);
  app.use(errorHandler(logger));

  return { app, logger };
}

import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { loadEnv } from "../config/env";
import type { AccessTokenClaims } from "../types/auth";
import { User, UserRole, UserStatus } from "../entities/User";
import { AppDataSource } from "../config/database";

export type { AccessTokenClaims };

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const env = loadEnv();
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing bearer token" });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AccessTokenClaims;
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: decoded.sub },
      select: ["id", "role", "status"],
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      return res.status(403).json({ message: "Account is not active", code: "account_inactive" });
    }
    decoded.role = user.role;
    req.auth = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired access token" });
  }
}

export function authorizeRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

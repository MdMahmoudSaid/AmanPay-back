import type { AccessTokenClaims } from "./auth";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      auth?: AccessTokenClaims;
    }
  }
}

export {};

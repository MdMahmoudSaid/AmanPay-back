import type { UserRole } from "../entities/User";

/** Claims embedded in the access JWT (do not confuse with `jsonwebtoken.JwtPayload`). */
export interface AccessTokenClaims {
  sub: number;
  role: UserRole;
}

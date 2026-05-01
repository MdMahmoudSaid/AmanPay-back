import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthService } from "../services/authService";
import { AppError } from "../common/errors";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(255),
  phone: z.string().max(50).optional(),
  accountType: z.enum(["user", "merchant"]).default("user"),
  merchantCategory: z.string().max(32).optional(),
});

const loginSchema = z
  .object({
    password: z.string().min(1),
    /** Preferred: email address or phone number (any common format). */
    identifier: z.string().min(1).optional(),
    /** @deprecated Use `identifier` — kept for older clients. */
    email: z.string().min(1).optional(),
  })
  .refine((d) => !!(d.identifier?.trim() || d.email?.trim()), {
    message: "Email or phone is required",
    path: ["identifier"],
  });

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z.string().min(8),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
const lookupRecipientSchema = z.object({
  identifier: z.string().min(1),
});

export class AuthController {
  private service = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = registerSchema.parse(req.body);
      const result = await this.service.register(
        body.email,
        body.password,
        body.fullName,
        body.phone?.trim() ? body.phone : undefined,
        body.accountType,
        body.merchantCategory?.trim() ? body.merchantCategory : undefined
      );
      res.status(201).json(result);
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  merchantCategories = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await this.service.listMerchantCategories();
      res.json(rows);
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = loginSchema.parse(req.body);
      const identifier = (body.identifier ?? body.email ?? "").trim();
      const result = await this.service.loginWithIdentifier(identifier, body.password);
      res.json(result);
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = refreshSchema.parse(req.body);
      const tokens = await this.service.refresh(body.refreshToken);
      res.json(tokens);
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = refreshSchema.parse(req.body);
      await this.service.logout(body.refreshToken);
      res.status(204).send();
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await this.service.getMe(req.auth.sub);
      res.json(user);
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = forgotPasswordSchema.parse(req.body);
      const result = await this.service.forgotPassword(body.email);
      res.json({
        message: "If the account exists, a password reset has been requested",
        ...result,
      });
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = resetPasswordSchema.parse(req.body);
      await this.service.resetPassword(body.resetToken, body.newPassword);
      res.json({ message: "Password has been reset successfully" });
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const body = updatePasswordSchema.parse(req.body);
      await this.service.updatePassword(req.auth.sub, body.currentPassword, body.newPassword);
      res.json({ message: "Password updated successfully" });
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  lookupRecipient = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = lookupRecipientSchema.parse(req.query);
      const row = await this.service.findRecipientByIdentifier(q.identifier);
      if (!row) return res.status(404).json({ message: "Recipient not found", code: "recipient_not_found" });
      res.json(row);
    } catch (err) {
      if (!this.sendKnownError(err, res)) next(err);
    }
  };

  private sendKnownError(err: unknown, res: Response): boolean {
    if (err instanceof z.ZodError) {
      res.status(400).json({ message: "Validation error", issues: err.flatten() });
      return true;
    }
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ message: err.message, code: err.code });
      return true;
    }
    return false;
  }
}

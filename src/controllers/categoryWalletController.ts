import type { NextFunction, Request, Response } from "express";
import { CategoryWalletService } from "../services/categoryWalletService";
import { sendAppError } from "./sendAppError";

export class CategoryWalletController {
  private service = new CategoryWalletService();

  getMine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth?.sub) return res.status(401).json({ message: "Unauthorized" });
      const wallets = await this.service.getForUser(req.auth.sub);
      res.json(wallets);
    } catch (err) {
      if (!sendAppError(err, res)) next(err);
    }
  };

  moveDynamicToMain = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth?.sub) return res.status(401).json({ message: "Unauthorized" });
      const result = await this.service.moveDynamicToMain(req.auth.sub, req.body?.category, req.body?.amount);
      res.json(result);
    } catch (err) {
      if (!sendAppError(err, res)) next(err);
    }
  };

  spendStrictToMerchant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth?.sub) return res.status(401).json({ message: "Unauthorized" });
      const result = await this.service.spendStrictToMerchant(
        req.auth.sub,
        req.body?.category,
        req.body?.merchantIdentifier,
        req.body?.amount
      );
      res.json(result);
    } catch (err) {
      if (!sendAppError(err, res)) next(err);
    }
  };

  payMerchant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth?.sub) return res.status(401).json({ message: "Unauthorized" });
      const result = await this.service.payMerchantFromCategoryWallet(req.auth.sub, req.body?.merchantId, req.body?.amount);
      res.json(result);
    } catch (err) {
      if (!sendAppError(err, res)) next(err);
    }
  };
}

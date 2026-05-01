import { Router } from "express";
import { CategoryWalletController } from "../controllers/categoryWalletController";

const router = Router();
const controller = new CategoryWalletController();

router.get("/me", controller.getMine);
router.post("/move-dynamic-to-main", controller.moveDynamicToMain);
router.post("/spend-strict", controller.spendStrictToMerchant);
router.post("/pay-merchant", controller.payMerchant);

export default router;

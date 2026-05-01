import { Router } from "express";
import { AuthController } from "../controllers/authController";

const router = Router();
const controller = new AuthController();

router.post("/register", controller.register);
router.get("/merchant-categories", controller.merchantCategories);
router.post("/login", controller.login);
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password", controller.resetPassword);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);

export default router;

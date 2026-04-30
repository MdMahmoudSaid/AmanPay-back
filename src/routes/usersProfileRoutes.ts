import { Router } from "express";
import { AuthController } from "../controllers/authController";

const router = Router();
const controller = new AuthController();

router.get("/me", controller.me);
router.get("/lookup-recipient", controller.lookupRecipient);
router.post("/update-password", controller.updatePassword);

export default router;

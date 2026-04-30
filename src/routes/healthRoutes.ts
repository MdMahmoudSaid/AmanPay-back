import { Router } from "express";
import { HealthController } from "../controllers/healthController";

const router = Router();
const controller = new HealthController();

router.get("/", controller.liveness);
router.get("/ready", controller.readiness);

export default router;

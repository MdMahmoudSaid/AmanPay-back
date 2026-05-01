import { Router } from "express";
import { AssistantController } from "../controllers/assistantController";

const router = Router();
const controller = new AssistantController();

router.post("/recommend", controller.recommend);

export default router;

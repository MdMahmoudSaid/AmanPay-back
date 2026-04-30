import { Router } from "express";
import { ActivityHistoryController } from "../controllers/activityHistoryController";

const router = Router();
const controller = new ActivityHistoryController();

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;

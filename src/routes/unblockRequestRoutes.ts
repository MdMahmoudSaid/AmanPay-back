import { Router } from "express";
import { UnblockRequestController } from "../controllers/unblockRequestController";

const router = Router();
const controller = new UnblockRequestController();

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;

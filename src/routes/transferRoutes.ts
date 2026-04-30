import { Router } from "express";
import { TransferController } from "../controllers/transferController";

const router = Router();
const controller = new TransferController();

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;

import { Router } from "express";
import { TransferController } from "../controllers/transferController";

const router = Router();
const controller = new TransferController();

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.post("/simple", controller.createSimple);
router.post("/envelope", controller.createEnvelope);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;

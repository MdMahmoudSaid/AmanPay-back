import { Router } from "express";
import { EnvelopeController } from "../controllers/envelopeController";

const router = Router();
const controller = new EnvelopeController();

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;

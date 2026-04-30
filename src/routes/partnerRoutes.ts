import { Router } from "express";
import { PartnerController } from "../controllers/partnerController";

const router = Router();
const controller = new PartnerController();

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;

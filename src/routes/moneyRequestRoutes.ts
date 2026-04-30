import { Router } from "express";
import { MoneyRequestController } from "../controllers/moneyRequestController";

const router = Router();
const controller = new MoneyRequestController();

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;

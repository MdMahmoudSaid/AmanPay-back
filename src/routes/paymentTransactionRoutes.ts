import { Router } from "express";
import { PaymentTransactionController } from "../controllers/paymentTransactionController";

const router = Router();
const controller = new PaymentTransactionController();

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;

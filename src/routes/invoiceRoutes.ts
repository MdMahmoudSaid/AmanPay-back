import { Router } from "express";
import { InvoiceController } from "../controllers/invoiceController";

const router = Router();
const controller = new InvoiceController();

router.get("/", controller.getAll);
router.get("/:id", controller.getOne);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

export default router;

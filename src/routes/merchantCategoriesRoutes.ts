import { Router } from "express";
import { MerchantCategoriesController } from "../controllers/merchantCategoriesController";

const router = Router();
const controller = new MerchantCategoriesController();

router.get("/", controller.getAll);
router.post("/", controller.create);
router.put("/:id", controller.update);

export default router;

import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import authRoutes from "./authRoutes";
import healthRoutes from "./healthRoutes";
import usersProfileRoutes from "./usersProfileRoutes";
import resourceRoutes from "./resourcesRoutes";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({ name: "AmanPay API", message: "AmanPay backend API" });
});

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);

router.use(authMiddleware);
router.use("/users", usersProfileRoutes);
router.use("/resources", resourceRoutes);

export default router;

import { Router } from "express";
import { authorizeRoles } from "../middlewares/authMiddleware";
import { UserRole } from "../entities/User";
import usersCrudRoutes from "./usersCrudRoutes";
import walletRoutes from "./walletRoutes";
import transferRoutes from "./transferRoutes";
import envelopeRoutes from "./envelopeRoutes";
import paymentTransactionRoutes from "./paymentTransactionRoutes";
import partnerRoutes from "./partnerRoutes";
import invoiceRoutes from "./invoiceRoutes";
import unblockRequestRoutes from "./unblockRequestRoutes";
import moneyRequestRoutes from "./moneyRequestRoutes";
import activityHistoryRoutes from "./activityHistoryRoutes";

const router = Router();

router.use("/users", authorizeRoles(UserRole.ADMIN), usersCrudRoutes);
router.use("/wallets", walletRoutes);
router.use("/transfers", transferRoutes);
router.use("/envelopes", envelopeRoutes);
router.use("/payment-transactions", paymentTransactionRoutes);
router.use("/partners", partnerRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/unblock-requests", unblockRequestRoutes);
router.use("/money-requests", moneyRequestRoutes);
router.use("/activity-history", activityHistoryRoutes);

export default router;

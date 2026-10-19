
import express from "express";
import { payOrder, getPayment } from "../controllers/payments.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";

const router = express.Router();

router.post("/orders/:id/pay", authenticate,authorize("customer"), payOrder);
router.get("/orders/:id/payment", authenticate, getPayment);

export default router;

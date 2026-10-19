
import express from "express";
import { payOrder, getPayment } from "../controllers/payments.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { orderRateLimiter } from "../middleware/rate-limit.middleware.js";

const router = express.Router();

router.post("/orders/:id/pay", orderRateLimiter ,authenticate,authorize("customer"), payOrder);
router.get("/orders/:id/payment", authenticate, getPayment);

export default router;

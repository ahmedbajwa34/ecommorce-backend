import express from "express";
import { placeOrder, listOfOrders, orderDetails,confirm, process, ship, deliver } from "../controllers/order.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { deleteOrder } from "../service/order.service.js";

const router = express.Router()

router.post("/placeOrder", authenticate, authorize("customer"), placeOrder)
router.get("/orders", authenticate, listOfOrders)
router.get("/order/:id", authenticate, orderDetails)
router.patch("/orders/:id/confirm", authenticate, authorize("admin"), confirm);
router.patch("/orders/:id/process", authenticate, authorize("admin"), process);
router.patch("/orders/:id/ship",    authenticate, authorize("admin"), ship);
router.patch("/orders/:id/deliver", authenticate, authorize("admin"), deliver);
router.delete("/orders/:id", authenticate, authorize("admin"), deleteOrder)
export default router; 
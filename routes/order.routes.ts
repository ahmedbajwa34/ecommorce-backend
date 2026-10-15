import express from "express";
import { placeOrder, listOfOrders, orderDetails } from "../controllers/order.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";


const router = express.Router()

router.post("/placeOrder", authenticate, placeOrder)
router.get("/orders", authenticate, listOfOrders)
router.get("/order/:id", authenticate, orderDetails)

export default router;
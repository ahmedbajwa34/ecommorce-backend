import express from "express";
import { gettingCart, updatingCartItem, addingProductToCart } from "../controllers/cart.controllers.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router()

router.get("/cart", authenticate, gettingCart )
router.post("/cartItems", authenticate, addingProductToCart)
router.patch("/cartItems/:product_id", authenticate, updatingCartItem)
export default router;

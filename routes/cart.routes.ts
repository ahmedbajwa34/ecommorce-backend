import express from "express";
import {
    cart,
    UpdatecartItem,
    addProductToCart,
    removeItemFromCart,
    emptyCart,
} from "../controllers/cart.controllers.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { validateData } from "../middleware/validation.middleware.js";
import { AddCartProductSchema, UpdateCartItemSchema } from "../schema/cart.schema.js";

const router = express.Router();

router.get("/cart", authenticate, cart);
router.post("/cart/items", authenticate, validateData(AddCartProductSchema), addProductToCart);
router.patch(
    "/cart/items/:product_id",
    authenticate,
    validateData(UpdateCartItemSchema),
    UpdatecartItem
);
router.delete("/cartItem/:product_id", authenticate, removeItemFromCart);
router.delete("/cart", authenticate, emptyCart);
export default router;

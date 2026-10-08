import express from "express";
import { gettingCart } from "../controllers/cart.controllers.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router()

router.get("/cart", authenticate, gettingCart )


export default router;

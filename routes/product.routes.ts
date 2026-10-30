import express from "express";
import {
    addPRODUCT,
    getProduct,
    getProductbyId,
    updateProduct,
    addCategory,
    listCategory,
} from "../controllers/product.controllers.js";
import { validateData } from "../middleware/validation.middleware.js";
import { CreateProductSchema } from "../schema/product.schema.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/categories", authenticate, authorize("admin"), addCategory);
router.get("/categories", authenticate, authorize, listCategory);
router.post("/products", authenticate, validateData(CreateProductSchema), addPRODUCT);
router.get("/products", authenticate, getProduct);
router.get("/products/:id", authenticate, getProductbyId);
router.patch("/products/:id", authenticate, authorize("admin"), updateProduct);

export default router;

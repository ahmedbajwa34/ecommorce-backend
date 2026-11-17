import express from "express";
import {
    addPRODUCT,
    gettingProduct,
    gettingProductbyId,
    updatingProduct,
    addCategory,
    listCategory,
} from "../controllers/product.controllers.js";
import { validateData } from "../middleware/validation.middleware.js";
import {
    CreateProductSchema,
    UpdateProductSchema,
    CreateCategorySchema,
} from "../schema/product.schema.js";
import { authorize } from "../middleware/authorize.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
    "/categories",
    authenticate,
    authorize("admin"),
    validateData(CreateCategorySchema),
    addCategory
);
router.get("/categories", listCategory);
router.post(
    "/products",
    authenticate,
    authorize("admin"),
    validateData(CreateProductSchema),
    addPRODUCT
);
router.get("/products", gettingProduct);
router.get("/products/:id", gettingProductbyId);
router.patch(
    "/products/:id",
    authenticate,
    authorize("admin"),
    validateData(UpdateProductSchema),
    updatingProduct
);

export default router;

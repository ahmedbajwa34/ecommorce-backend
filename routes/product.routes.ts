

import express from "express"
import { addPRODUCT, gettingProduct , gettingProductbyId, updatingProduct} from "../controllers/product.controllers.js";
import { validateProductData } from "../middleware/validation.middleware.js";

const router = express.Router();

router.post("/products", validateProductData, addPRODUCT)
router.get("/products", gettingProduct)
router.get("/products/:id", gettingProductbyId)
router.patch("/products/:id", updatingProduct);


export default router;

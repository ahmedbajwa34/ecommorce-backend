

import express from "express"
import { addPRODUCT, gettingProduct , gettingProductbyId, updatingProduct} from "../controllers/product.controllers.js";
import { validateData } from "../middleware/validation.middleware.js";
import { CreateProductSchema } from "../schema/product.schema.js";


const router = express.Router();
router.post("/products", validateData(CreateProductSchema), addPRODUCT)
router.get("/products", gettingProduct)
router.get("/products/:id", gettingProductbyId)
router.patch("/products/:id", updatingProduct);

export default router;

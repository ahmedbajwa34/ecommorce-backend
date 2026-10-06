


import { CreateProductSchema } from "../schema/product.schema.js";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError.js";


export const validateProductData = async(req: Request, res: Response, next: NextFunction) => {
    const result = CreateProductSchema.safeParse(req.body);

    if(!result.success) {
        throw new AppError("Invalid Product Data", 400)
    }

    req.body = result.data;

    next();
    
}    
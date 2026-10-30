import {
    createProduct,
    Product,
    ProductbyId,
    updatedProduct,
    addToCategory,
    getCategory,
} from "../service/product.service.js";
import type { Request, Response } from "express";

export const addCategory = async (req: Request, res: Response) => {
    const data = req.body;

    const result = await addToCategory(data);
    res.status(201).json({
        message: "Category Created Successfully",
        data: result,
    });
};

export const listCategory = async (req: Request, res: Response) => {
    const result = await getCategory();

    res.status(200).json({
        message: "List Of Categories",
        data: result,
    });
};

export const addPRODUCT = async (req: Request, res: Response) => {
    const data = req.body;

    const result = await createProduct(data);
    res.status(201).json({
        message: "Product Created Sunccessfully",
        data: result,
    });
};

export const getProduct = async (req: Request, res: Response) => {
    const result = await Product();

    res.status(200).json({
        data: result,
    });
};

export const getProductbyId = async (req: Request, res: Response) => {
    const getId = Number(req.params.id);

    const result = await ProductbyId(getId);

    if (!result) {
        res.status(404).json({
            message: "User not found",
        });
    }
    res.status(200).json({
        data: result,
    });
};

export const updateProduct = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = req.body;

    const result = await updatedProduct(id, data);

    if (!result) {
        return res.status(404).json({
            message: "Product not found",
        });
    }

    res.status(200).json({
        message: "Product updated successfully",
        data: result,
    });
};

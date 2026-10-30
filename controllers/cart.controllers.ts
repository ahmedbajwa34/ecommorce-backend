import type { Request, Response } from "express";
import {
    getCart,
    updateCartItem,
    addCartProduct,
    removeCartItem,
    clearCart,
} from "../service/cart.service.js";
import { AppError } from "../errors/AppError.js";

export const cart = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const result = await getCart(userId);

    return res.status(200).json({
        message: "Cart Items Fetched",
        data: result,
    });
};

export const addProductToCart = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const product_id = Number(req.body.product_id);
    const quantity = Number(req.body.quantity);

    if (
        !Number.isInteger(product_id) ||
        product_id < 1 ||
        !Number.isInteger(quantity) ||
        quantity < 1
    ) {
        throw new AppError("Invalid product_id or quantity", 400);
    }

    const result = await addCartProduct({ userId, product_id, quantity });

    return res.status(201).json({
        message: "PRODUCT ADDED TO THE CART",
        data: result,
    });
};

export const UpdatecartItem = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const product_id = Number(req.params.product_id);
    const quantity = Number(req.body.quantity);

    if (
        !Number.isInteger(product_id) ||
        product_id < 1 ||
        !Number.isInteger(quantity) ||
        quantity < 1
    ) {
        throw new AppError("Invalid product_id or quantity", 400);
    }

    const result = await updateCartItem({ userId, product_id, quantity });

    return res.status(200).json({
        message: "Cart item updated successfully",
        data: result,
    });
};

export const removeItemFromCart = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const product_id = Number(req.params.product_id);

    if (!Number.isInteger(product_id) || product_id < 1) {
        throw new AppError("Invalid product_id", 400);
    }

    const result = await removeCartItem(userId, product_id);

    return res.status(200).json({
        message: "Item removed from cart",
        data: result,
    });
};

export const emptyCart = async (req: Request, res: Response) => {
    const userId = req.user!.id;

    await clearCart(userId);

    return res.status(200).json({
        message: "Cart cleared",
    });
};

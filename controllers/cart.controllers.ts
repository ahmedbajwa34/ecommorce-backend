import type { Request, Response } from "express";
import { getCart, updateCartItem,addCartProduct } from "../service/cart.service.js";

export const gettingCart = async(req: Request, res: Response) => {
   const userId = req.user!.id
   const result = await getCart(userId)
   
   return res.status(200).json({
    message: "Cart Items Fetched",
    data: result
   })

}

export const addingProductToCart = async(req: Request, res: Response) =>{
      const userId = req.user!.id

      const { product_id, quantity} = req.body;

     const result = await addCartProduct({
      userId, quantity, product_id
     });
     
     return res.status(201).json({
      message: "PRODUCT ADDED TO THE CART",
      data: result
     })


}

export const updatingCartItem = async (
    req: Request,
    res: Response
) => {
    const userId = req.user!.id;
    const product_id = Number(req.params.product_id);

    const { quantity } = req.body;

    const result = await updateCartItem({
        userId,
        product_id,
        quantity
    });

    return res.status(200).json({
        message: "Cart item updated successfully",
        data: result
    });
};
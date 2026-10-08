import type { Request, Response } from "express";
import { getCart } from "../service/cart.service.js";

export const gettingCart = async(req: Request, res: Response) => {
   const userId = req.user!.id
   const result = await getCart(userId)
   
   return res.status(200).json({
    message: "Cart Items Fetched",
    data: result
   })

}
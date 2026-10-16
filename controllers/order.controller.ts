
import { AppError } from "../errors/AppError.js";
import { checkout, getOrders, getOrderById, deleteOrder, confirmOrder, processOrder, shipOrder,deliverOrder } from "../service/order.service.js";
import { Request, Response } from "express";

export const placeOrder = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { shipping_address, payment_method } = req.body;

   if(typeof shipping_address !== 'string' || shipping_address.length > 255) {
        throw new AppError("address is required (maximum 255 character", 400)
   }

   const order = await checkout({userId, shipping_address, payment_method})
   
   res.status(201).json({
     message: "Order Created",
     data: order
   })

}

export const listOfOrders = async(req: Request, res: Response) => {
    const orders = await getOrders(req.user!.id)
    res.status(200).json({
        message: "List of Orders",
        data: orders
    }) 
}

export const orderDetails = async(req: Request, res: Response) => {
   const orderId =  Number(req.params.id)
   
   if(!Number.isInteger(orderId) || orderId < 1) {
         throw new AppError("Invalid Order Id", 400)
   }
    const order = await getOrderById(req.user!.id, orderId)
    res.status(200).json({
        message: "Order Fetched",
        data: order
    })
}


export const deleteOrderById = async(req: Request, res: Response) => {
  
    const orderId = Number(req.params.id)
      
    if(!Number.isInteger(orderId) || orderId < 1) {
         throw new AppError("Invalid Order Id", 400)
   }

   const order = await deleteOrder(orderId)
   res.status(200).json({
    mesage: "Order Deleted Successfully "
   })
}





export const confirm = async( req: Request, res: Response) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("Invalid order id", 400);
     }
    const order = await confirmOrder(id)
    return res.status(200).json({ 
        message: "Order confirmed", 
        data: order 
    });

}

export const process = async( req: Request, res: Response) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("Invalid order id", 400);
     }
    const order = await processOrder(id)
    return res.status(200).json({ 
        message: "Order is Processing", 
        data: order 
    });

}


export const ship = async( req: Request, res: Response) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("Invalid order id", 400);
     }
    const order = await shipOrder(id)
    return res.status(200).json({ 
        message: "Order is Processing", 
        data: order 
    });

}


export const deliver = async( req: Request, res: Response) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError("Invalid order id", 400);
     }
    const order = await deliverOrder(id)
    return res.status(200).json({ 
        message: "Order is Processing", 
        data: order 
    });

}
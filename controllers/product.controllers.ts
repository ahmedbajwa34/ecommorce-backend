import express from "express";
import { createProduct, getProduct,getProductbyId, updateProduct } from "../service/product.service.js";
import type { Request, Response } from "express";



export const addPRODUCT = async(req: Request, res: Response)=> {
  
const data  = req.body;

const result = await createProduct(data);
res.status(201).json({
    message: "Product Created Sunccessfully",
    data: result
})
}


export const gettingProduct = async(req: Request, res: Response) => {

    const result = await getProduct();

    res.status(200).json({
        data: result
    })
}

export const gettingProductbyId = async(req: Request, res: Response) => {
    
    const getId = Number(req.params.id)

    const result = await getProductbyId(getId)
    
    if (!result) {

         res.status(404).json({
            message: "User not found"
         })
    }
    res.status(200).json({
        data: result 
    })


}


export const updatingProduct = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const data = req.body;

    const result = await updateProduct(id, data);

    if (!result) {
        return res.status(404).json({
            message: "Product not found"
        });
    }

    res.status(200).json({
        message: "Product updated successfully",
        data: result
    });
};
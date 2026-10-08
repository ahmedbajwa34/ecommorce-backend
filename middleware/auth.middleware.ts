
import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken";
import "dotenv/config"
import { AuthPayload } from "../types/auth.types.js";


export const authenticate = async(req: Request, res: Response, next: NextFunction) => {

    const token: string | undefined = req.cookies.token;

    if(!token) {
        return res.status(401).json({
            message: "Unauthorized token"
        })
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
        req.user = decoded
        next()
    }
    catch(error){
        console.error("jwt error", error)

        return res.status(401).json({
            message: "Invalid Token"
        })
    }
 

}
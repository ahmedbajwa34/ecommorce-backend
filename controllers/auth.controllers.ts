
import type { Request, Response } from "express"
import { loginUserSchema, registerUserSchema } from "../schema/auth.schema.js"
import { registerUser,loginUser } from "../service/auth.service.js";


export const registeringUser = async(req: Request, res: Response) => {
  
    const data = registerUserSchema.parse(req.body);

    const result = await registerUser(data);
    
    res.status(201).json({
       message: "User Created",
       data: result
    })

}

export const loggingUser = async(req: Request, res: Response) => {
    
    const data = loginUserSchema.parse(req.body)

    const result = await loginUser(data.email, data.password);
    
    res.cookie("token", result.token, {
        httpOnly: true,
        sameSite: 'lax',
        path: "/"
    })
    res.status(200).json({
        success : true,
        message: "User LoggedIn",
        data: result,
       
    })
}
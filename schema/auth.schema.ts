import { z } from "zod";


export const registerUserSchema = z.object({
    name: z.string().min(2).max(60),
    email: z.string().email().max(100),
    password: z.string().min(8)
})


export const loginUserSchema = z.object({
    email: z.string().email().max(150),
    password: z.string().min(8)
})
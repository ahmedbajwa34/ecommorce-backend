
import type { Request, Response, NextFunction } from "express";
import type { z } from "zod";
import { AppError } from "../errors/AppError.js";

export const validateData = (schema: z.ZodType) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            throw new AppError("Invalid request data", 400);
        }

        req.body = result.data;
        next();
    };
};


import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            message: err.message,
        });
    }

    if (err instanceof ZodError) {
        return res.status(400).json({
            message: "Invalid request data",
            issues: err.issues,
        });
    }

    console.error(err);

    return res.status(500).json({
        message: "Internal Server Error",
    });
};

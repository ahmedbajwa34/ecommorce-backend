
import type { Request, Response, NextFunction } from "express"
import type { Role } from "../types/auth.types.js"
import { AppError } from "../errors/AppError.js";

export const authorize = (requiredRole: Role) => {
    return (req: Request, res: Response, next: NextFunction) => {
       if(!req.user) {
       throw new AppError("UNAUTHORIZED", 401)
       }

       if(req.user.role !== requiredRole) {
        throw new AppError("FORBIDDEN No permission allowed", 403)
       }

       next()
    };
};
import type { Request, Response } from "express";
import { loginUserSchema, registerUserSchema } from "../schema/auth.schema.js";
import { registerUser, loginUser } from "../service/auth.service.js";
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    ACCESS_MS,
    REFRESH_MS,
} from "../service/token.service.js";

export const register = async (req: Request, res: Response) => {
    const data = registerUserSchema.parse(req.body);

    const result = await registerUser(data);

    res.status(201).json({
        message: "User Created",
        data: result,
    });
};

export const login = async (req: Request, res: Response) => {
    const data = loginUserSchema.parse(req.body);

    const user = await loginUser(data.email, data.password);

    res.cookie("token", signAccessToken(user), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: ACCESS_MS,
    });

    res.cookie("refresh_token", signRefreshToken(user), {
        httpOnly: true,
        sameSite: "lax",
        path: "/api/auth",
        maxAge: REFRESH_MS,
    });

    res.status(200).json({
        success: true,
        message: "User LoggedIn",
    });
};

export const refresh = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
        return res.status(401).json({
            message: "No refresh token, please login",
        });
    }

    const user = verifyRefreshToken(refreshToken);

    if (!user) {
        res.clearCookie("refresh_token", { path: "/api/auth" });
        return res.status(401).json({
            message: "Refresh token expired, please login",
        });
    }

    res.cookie("token", signAccessToken(user), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: ACCESS_MS,
    });

    return res.status(200).json({
        message: "Access token refreshed",
    });
};

export const logout = async (_req: Request, res: Response) => {
    res.clearCookie("token", { path: "/" });

    res.clearCookie("refresh_token", { path: "/api/auth" });
    return res.status(200).json({
        message: "Logged out",
    });
};

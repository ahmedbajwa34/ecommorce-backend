import jwt from "jsonwebtoken";

export const ACCESS_MS = 15 * 60 * 1000;
export const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

type Payload = { id: number; role: string };

export const signAccessToken = (user: Payload) =>
    jwt.sign({ id: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET!, {
        expiresIn: "15m",
    });

export const signRefreshToken = (user: Payload) =>
    jwt.sign({ id: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: "7d",
    });

export const verifyRefreshToken = (token: string): Payload | null => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as Payload;
        return { id: decoded.id, role: decoded.role };
    } catch {
        return null;
    }
};

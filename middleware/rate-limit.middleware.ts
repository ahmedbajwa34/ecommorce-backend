
import rateLimit from "express-rate-limit";

const createLimiter = (windowMs: number, limit: number, message: string, skipSuccessful = false) =>
    rateLimit({
        windowMs,
        limit,
        skipSuccessfulRequests: skipSuccessful,
        message: {
            success: false,
            error: { code: "RATE_LIMIT_EXCEEDED", message },
        },
    });

export const loginRateLimiter   = createLimiter(15 * 60 * 1000, 5,   "Too many login attempts. Please try again later.", true);
export const refreshRateLimiter = createLimiter(15 * 60 * 1000, 30,  "Too many refresh attempts. Please try again later.");
export const signupRateLimiter  = createLimiter(60 * 60 * 1000, 10,  "Too many accounts created. Please try again later.");
export const orderRateLimiter   = createLimiter(60 * 1000,      10,  "Too many order requests. Please slow down.");
export const globalRateLimiter  = createLimiter(60 * 1000,      100, "Too many requests. Please slow down.");
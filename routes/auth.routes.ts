import express from "express";
import { register, login, refresh, logout } from "../controllers/auth.controllers.js";
import { signupRateLimiter, loginRateLimiter, refreshRateLimiter } from "../middleware/rate-limit.middleware.js";

const router = express.Router();

router.post("/register", signupRateLimiter, register);
router.post("/login", loginRateLimiter, login);
router.post("/auth/refresh", refreshRateLimiter, refresh);
router.post("/logout", logout);
export default router;

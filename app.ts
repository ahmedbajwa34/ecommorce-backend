import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pool from "./db/db.js";
import productRoutes from "./routes/product.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import { connectRedis } from "./db/redis.js";
import paymentRoutes from "./routes/payments.routes.js";
import { globalRateLimiter } from "./middleware/rate-limit.middleware.js";
import { stripeWebhook } from "./controllers/payments.controller.js";

const app = express();
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(helmet());
app.use(
    cors({
        origin: frontendOrigin,
        credentials: true,
    })
);

app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json());
app.use(cookieParser());
app.use(globalRateLimiter);

app.use("/api", productRoutes);
app.use("/api", authRoutes);
app.use("/api", cartRoutes);
app.use("/api", orderRoutes);
app.use("/api", paymentRoutes);

app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true });
});

app.get("/", async (_req, res) => {
    const result = await pool.query("SELECT NOW()");
    res.json({
        message: "API is running",
        dbTime: result.rows[0],
    });
});

app.use(errorHandler);

connectRedis()
    .then(() => {
        app.listen(3000, () => {
            console.log("Server running at PORT: 3000");
        });
    })
    .catch((error) => {
        console.error("Failed to connect to Redis:", error);
        process.exit(1);
    });

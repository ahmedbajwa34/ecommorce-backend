
import express from "express";
import pool from "./db/db.js";
import productRoutes from "./routes/product.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js"
import { connectRedis } from "./db/redis.js";

const app = express()

app.use(express.json())
app.use(cookieParser())


app.use("/api",productRoutes)
app.use("/api", authRoutes)
app.use("/api", cartRoutes)
app.use("/api", orderRoutes)

app.use(errorHandler)
app.get("/", async(req, res)=> {
    const result = await pool.query("SELECT NOW()")

    console.log(result.rows[0]);

    res.json({
        message:"DB is working"
    })
    
})

  

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
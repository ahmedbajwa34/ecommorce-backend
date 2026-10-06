
import express from "express";
import pool from "./db/db.js";
import productRoutes from "./routes/product.routes.js";
import { errorHandler } from "./middleware/product.middleware.js";


const app = express()

app.use(express.json())

app.use("/api",productRoutes)

app.use(errorHandler)
app.get("/", async(req, res)=> {
    const result = await pool.query("SELECT NOW()")

    console.log(result.rows[0]);

    res.json({
        message:"DB is working"
    })
    
})

app.get("/health/db", async(req, res) => {
      const result = await pool.query("SELECT NOW()")

      res.status(200).json({
        database: "Connected"
      })
      
})

app.listen(3000, ()=> {
    console.log("Server Running at Port:3000");
    
})
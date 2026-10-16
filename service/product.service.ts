
import pool from "../db/db.js";
import type { CreateProductData, UpdateProductData } from "../types/product.types.js";
import { AppError } from "../errors/AppError.js";
import { redisClient } from "../db/redis.js";
import { invalidateProductCache } from "./product-cache.service.js";

type Data = {
    name: string
}

export const addToCategory = async(data: Data) => {

    const { name } = data;

    const result = await pool.query(
        `INSERT INTO categories(name)
        VALUES($1)
        RETURNING name
        `,[name]
    )
    return result.rows[0];
}

export const getCategory = async () => {
    const result =  await pool.query(
        `SELECT * FROM categories`
    )
    if(result.rows.length === 0) {
        throw new AppError("Category not found", 404)
    }
    return result.rows[0]
}

export const createProduct = async (data: CreateProductData) => {

    const { name, description, price, stock, category_id } = data;

    const result = await pool.query(
        `INSERT INTO products(name, description, price, stock, category_id)
        VALUES($1, $2, $3, $4, $5)
        RETURNING id, name, description, price, stock, category_id, created_at`,
        [name, description, price, stock, category_id]
    );

    return result.rows[0];
};

export const getProduct = async() => {
    const cache_key = "product:all"

    try{
        const cached = await redisClient.get(cache_key)
        if (cached) {
            console.log("REDIS HIT")
            return JSON.parse(cached)

        }
    }
    catch( error){
        console.log("Redis Cache Read Failed", error);
    }

    const data = await pool.query(
        `SELECT id, name, description, price, stock, category_id
        FROM products`
    )
    if(data.rows.length === 0){
       throw new AppError("Product not found", 404)
    }
    try{
        await redisClient.set(
            cache_key,
            JSON.stringify(data.rows),
            { EX: 300 }
        )
    }
    catch(error){
        console.log("Redis write failed", error);
    }

    return data.rows
}

export const getProductbyId = async(getId: number) => {
    const cache_key = `product:: ${getId}`
     
    try{
        const cache = await redisClient.get(cache_key)
        if(cache) {
            console.log("REDIS HIT");
            return JSON.parse(cache)   
        }
    }
    catch(error){
        console.log("REDIS read failed", error);
        
    }

    const data = await pool.query(
          `SELECT id, name, description, price, stock, category_id
           FROM products 
           WHERE id = $1`, [getId] 
    )
    if(data.rows.length === 0) {
        throw new AppError("Product not found", 404)
     }

    try{
      await redisClient.set(
        cache_key,
        JSON.stringify(data.rows[0]),
        { EX: 300 }
      )
    }
    catch(error){
        console.log("REDIS write failed", error);
        
    }

    return data.rows[0]
}


export const updateProduct = async (id:number, data: UpdateProductData) => {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
        fields.push(`name = $${values.length + 1}`);
        values.push(data.name);
    }

    if (data.description !== undefined) {
        fields.push(`description = $${values.length + 1}`);
        values.push(data.description);
    }

    if (data.price !== undefined) {
        fields.push(`price = $${values.length + 1}`);
        values.push(data.price);
    }

    if (data.stock !== undefined) {
        fields.push(`stock = $${values.length + 1}`);
        values.push(data.stock);
    }

    if (data.category_id !== undefined) {
        fields.push(`category_id = $${values.length + 1}`);
        values.push(data.category_id);
    }

    // Nothing was provided to update
    if (fields.length === 0) {
        return null;
    }

    // ID becomes the final parameter
    values.push(id);

    const result = await pool.query(
        `UPDATE products
         SET ${fields.join(", ")}
         WHERE id = $${values.length}
         RETURNING id, name, description, price, stock, category_id`,
        values
    );
    if (fields.length === 0) {
    throw new AppError("No fields provided for update", 400);
    }
      
    const update = result.rows[0];
    
    if(update.rows.length === 0) {
        throw new AppError("Product not found", 404)
    }
    try {
        await invalidateProductCache(id);
    }
    catch(error) {
        console.error("Product cache invalidation failed:", error);
    }

    return update;
};
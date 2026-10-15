
import pool from "../db/db.js"
import { AppError } from "../errors/AppError.js";
import { AddCartProductServiceData } from "../schema/cart.schema.js"

export const getCart = async (userId: number) => {
    const cartResult = await pool.query(
        `SELECT * FROM carts WHERE user_id = $1`,
        [userId]
    );

    const cart = cartResult.rows[0];

    if (!cart) {
        return { cart: null, items: [] };
    }

    const itemsResult = await pool.query(
        `SELECT
            ci.id,
            ci.quantity,
            ci.cart_id,
            ci.product_id,
            p.name,
            p.description,
            p.price,
            (ci.quantity * p.price) AS line_total
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.cart_id = $1
         ORDER BY ci.id`,
        [cart.cart_id]
    );

    return {
        cart,
        items: itemsResult.rows
    };
};



export const addCartProduct = async (data: AddCartProductServiceData) => {
    const client = await pool.connect();
  
    try {
        await client.query("BEGIN");
      
        const productResult = await client.query(
            `SELECT id, stock
             FROM products
             WHERE id = $1
             FOR UPDATE`,
            [data.product_id]
        );

        const product = productResult.rows[0];

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        await client.query(
            `INSERT INTO carts (user_id)
             VALUES ($1)
             ON CONFLICT (user_id) DO NOTHING`,
            [data.userId]
        );

        const cartResult = await client.query(
            `SELECT cart_id
             FROM carts
             WHERE user_id = $1`,
            [data.userId]
        );

        const cart = cartResult.rows[0];

        if (!cart) {
            throw new AppError("Cart not found", 404);
        }

        const existingItemResult = await client.query(
            `SELECT quantity
             FROM cart_items
             WHERE cart_id = $1
               AND product_id = $2`,
            [cart.cart_id, data.product_id]
        );

        const currentQuantity = existingItemResult.rows[0]?.quantity ?? 0;
        const finalQuantity = currentQuantity + data.quantity;

        if (finalQuantity > product.stock) {
            throw new AppError("Insufficient stock", 409);
        }

        const itemResult = await client.query(
            `INSERT INTO cart_items (cart_id, product_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (cart_id, product_id)
             DO UPDATE SET
                 quantity = cart_items.quantity + EXCLUDED.quantity
             RETURNING *`,
            [cart.cart_id, data.product_id, data.quantity]
        );

        await client.query("COMMIT");
    
        return {
            cart_id: cart.cart_id,
            item: itemResult.rows[0]
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error; 
    } finally {
        client.release();
    }
};

type UpdateProductData = {
    userId: number;
    product_id: number;
    quantity: number;
};

export const updateCartItem = async (data: UpdateProductData) => {
    const client = await pool.connect();
   
    try {
        await client.query("BEGIN");

        const cartResult = await client.query(
            `SELECT cart_id
             FROM carts
             WHERE user_id = $1`,
            [data.userId]
        );

        const cart = cartResult.rows[0];

        if (!cart) {
            throw new AppError("Cart not found", 404);
        }

        const productResult = await client.query(
            `SELECT id, stock
             FROM products
             WHERE id = $1
             FOR UPDATE`,
            [data.product_id]
        );

        const product = productResult.rows[0];

        if (!product) {
            throw new AppError("Product not found", 404);
        }

        if (data.quantity > product.stock) {
            throw new AppError("Insufficient stock", 409);
        }

        const updatedItemResult = await client.query(
            `UPDATE cart_items
             SET quantity = $1
             WHERE cart_id = $2
               AND product_id = $3
             RETURNING *`,
            [data.quantity, cart.cart_id, data.product_id]
        );

        const updatedItem = updatedItemResult.rows[0];

        if (!updatedItem) {
            throw new AppError("Cart item not found", 404);
        }

        await client.query("COMMIT");

        return {
            cart_id: cart.cart_id,
            item: updatedItem
        };
    } catch (error){
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};


export const removeCartItem = async (userId: number, product_id: number) => {
    const result = await pool.query(
        `DELETE FROM cart_items
         WHERE product_id = $2
           AND cart_id = (SELECT cart_id FROM carts WHERE user_id = $1)
         RETURNING *`,
        [userId, product_id]
    );

    if (result.rows.length === 0) {
        throw new AppError("Cart item not found", 404);
    }

    return result.rows[0];
};

export const clearCart = async (userId: number) => {
    await pool.query(
        `DELETE FROM cart_items
         WHERE cart_id = (SELECT cart_id FROM carts WHERE user_id = $1)`,
        [userId]
    );
};
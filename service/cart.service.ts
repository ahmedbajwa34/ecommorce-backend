import { $ZodCUID2 } from "zod/v4/core";
import pool from "../db/db.js"
import { AppError } from "../errors/AppError.js";

export const getCart = async( userId: number) => {
 

    const findCart = await pool.query(
        `SELECT * FROM carts
        WHERE user_id = $1`, [userId]
)

    const findedCart = findCart.rows[0];
    
    let cart;

    if(!findedCart) {
        const createCart = await pool.query(
            `INSERT INTO carts(user_id)
            VALUES ($1)
            RETURNING *`, 
            [userId]
        )
    cart = createCart.rows[0];
}       else {
    cart = findedCart;
}
    const items = await pool.query(
        `SELECT 
        ci.id,
        ci.quantity,
        ci.cart_id, 
        p.name,
        p.description,
        p.price
         FROM cart_items ci
         JOIN products p 
         ON ci.product_id = p.id
         WHERE ci.id = $1`,
         [cart.cart_id]
    );

     return {
        cart,
        items: items.rows
    };

}


type AddCartProductData = {
    userId: number;
    product_id: number;
    quantity: number;
};

export const addCartProduct = async (data: AddCartProductData) => {
    const client = await pool.connect();

    try {
        // 1. Start a transaction
        await client.query("BEGIN");

        // 2. Find and lock the product row
        const productResult = await client.query(
            `SELECT id, stock
             FROM products
             WHERE id = $1
             FOR UPDATE`,
            [data.product_id]
        );

        if (productResult.rows.length === 0) {
            throw new AppError("Product not found", 404);
        }

        const product = productResult.rows[0];

        // 3. Find the user's cart, creating it if necessary
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

        // 4. Check whether this product is already in the cart
        const existingItemResult = await client.query(
            `SELECT quantity
             FROM cart_items
             WHERE cart_id = $1
               AND product_id = $2`,
            [cart.cart_id, data.product_id]
        );

        const currentQuantity =
            existingItemResult.rows[0]?.quantity ?? 0;

        const finalQuantity = currentQuantity + data.quantity;

        // 5. Reject quantities exceeding available stock
        if (finalQuantity > product.stock) {
            throw new AppError("Insufficient stock", 409);
        }

        // 6. Insert a new item or increment the existing quantity
        const itemResult = await client.query(
            `INSERT INTO cart_items (cart_id, product_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (cart_id, product_id)
             DO UPDATE SET
                 quantity = cart_items.quantity + EXCLUDED.quantity
             RETURNING *`,
            [cart.cart_id, data.product_id, data.quantity]
        );

        // 7. Commit all changes
        await client.query("COMMIT");

        return {
            cart_id: cart.cart_id,
            item: itemResult.rows[0]
        };
    } catch (error) {
        // Undo changes if any operation fails
        await client.query("ROLLBACK");
        throw error;
    } finally {
        // Always return the connection to the pool
        client.release();
    }
};

type UpdateProductData = {
    userId: number,
    product_id: number,
    quantity: number
}

export const updateCartItem = async(data: UpdateProductData) => {

    const client = await pool.connect();

     try {
        await client.query("BEGIN");

        // 1. Validate the requested quantity
        if (!Number.isInteger(data.quantity) || data.quantity <= 0) {
            throw new AppError("Quantity must be a positive integer", 400);
        }

        // 2. Find the authenticated user's cart
        const cartResult = await client.query(
            `SELECT cart_id
             FROM carts
             WHERE user_id = $1`,
            [data.userId]
        );

        if (cartResult.rows.length === 0) {
            throw new AppError("Cart not found", 404);
        }

        const cart = cartResult.rows[0];

        // 3. Confirm the product is already in this user's cart
        const cartItemResult = await client.query(
            `SELECT id
             FROM cart_items
             WHERE cart_id = $1
               AND product_id = $2`,
            [cart.cart_id, data.product_id]
        );

        if (cartItemResult.rows.length === 0) {
            throw new AppError("Cart item not found", 404);
        }

        // 4. Lock the product row and check current stock
        const productResult = await client.query(
            `SELECT id, stock
             FROM products
             WHERE id = $1
             FOR UPDATE`,
            [data.product_id]
        );

        if (productResult.rows.length === 0) {
            throw new AppError("Product not found", 404);
        }

        const product = productResult.rows[0];

        if (data.quantity > product.stock) {
            throw new AppError("Insufficient stock", 409);
        }

        // 5. Replace the existing quantity
        const updatedItemResult = await client.query(
            `UPDATE cart_items
             SET quantity = $1
             WHERE cart_id = $2
               AND product_id = $3
             RETURNING *`,
            [data.quantity, cart.cart_id, data.product_id]
        );

        // 6. Commit the transaction
        await client.query("COMMIT");

        return {
            cart_id: cart.cart_id,
            item: updatedItemResult.rows[0]
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
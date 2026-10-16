
import pool from "../db/db.js";
import { AppError } from "../errors/AppError.js";

type CheckoutData = {
    userId: number;
    shipping_address: string;
    payment_method: "card" | "bank_transfer" | "cash_on_delivery";
};

export const checkout = async (data: CheckoutData) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

     
        const itemsResult = await client.query(
            `SELECT ci.product_id, ci.quantity, p.name, p.stock
             FROM cart_items ci
             JOIN carts c ON c.cart_id = ci.cart_id
             JOIN products p ON p.id = ci.product_id
             WHERE c.user_id = $1
             ORDER BY p.id
             FOR UPDATE OF p`,
            [data.userId]
        );

        if (itemsResult.rows.length === 0) {
            throw new AppError("Cart is empty", 400);
        }

        for (const item of itemsResult.rows) {
            if (item.quantity > item.stock) {
                throw new AppError(`Insufficient stock`, 409);
            }
        }

        const orderResult = await client.query(
            `INSERT INTO orders (user_id, status, total, shipping_address)
             VALUES ($1, 'pending', 0, $2)
             RETURNING id`,
            [data.userId, data.shipping_address]
        );
        const orderId = orderResult.rows[0].id;

        await client.query(
            `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
             SELECT $1, ci.product_id, ci.quantity, p.price
             FROM cart_items ci
             JOIN carts c ON c.cart_id = ci.cart_id
             JOIN products p ON p.id = ci.product_id
             WHERE c.user_id = $2`,
            [orderId, data.userId]
        );

        await client.query(
            `UPDATE products p
             SET stock = p.stock - oi.quantity
             FROM order_items oi
             WHERE oi.order_id = $1 AND oi.product_id = p.id`,
            [orderId]
        );

      
        const totalResult = await client.query(
            `UPDATE orders
             SET total = (SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = $1)
             WHERE id = $1
             RETURNING *`,
            [orderId]
        );
        const order = totalResult.rows[0];

        await client.query(
            `INSERT INTO payments (order_id, amount, status, payment_method)
             VALUES ($1, $2, 'pending', $3)`,
            [orderId, order.total, data.payment_method]
        );

        await client.query(
            `INSERT INTO order_status_history (order_id, status)
             VALUES ($1, 'pending')`,
            [orderId]
        );

        await client.query(
            `DELETE FROM cart_items
             WHERE cart_id = (SELECT cart_id FROM carts WHERE user_id = $1)`,
            [data.userId]
        );

        await client.query("COMMIT");

        return order;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const getOrders = async (userId: number) => {
    const result = await pool.query(
        `SELECT id, status, total, shipping_address, created_at
         FROM orders
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
    );
    return result.rows;
};

export const getOrderById = async (userId: number, orderId: number) => {
    const orderResult = await pool.query(
        `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
        [orderId, userId]
    );
    const order = orderResult.rows[0];

    if (!order) 
        { throw new AppError("Order not found", 404) }

    const itemsResult = await pool.query(
        `SELECT oi.product_id, p.name, oi.quantity, oi.unit_price,
                (oi.quantity * oi.unit_price) AS line_total
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = $1
         ORDER BY oi.id`,
        [orderId]
    );

    return { 
            order, 
            items: itemsResult.rows 
           };
};


export const deleteOrder = async(orderId: number) => {
    const client = await pool.connect();

    try {
        const orderStatus = await client.query(
            `SELECT status from orders
            WHERE order_id = $1`,[orderId]
        )
        const order = orderStatus.rows[0]

        if(order.rows.length === 0) {
            throw new AppError("Order not found", 404)
        }

        if(order.status !== "cancelled"){
            throw new AppError("Order Status is not canceled", 409)
        }

        await client.query(
            `DELETE FROM payments 
            WHERE order_id = $1`,[orderId]
        )
        await client.query(
            `DELETE FROM order_items
            WHERE order_id = $1`, [orderId]
        )
        await client.query(
            `DELETE FROM order_status_history
            WHERE order_id = $1`, [orderId]
        )
         await client.query(
            `DELETE FROM orders
            WHERE order_id = $1`, [orderId]
        )

        await client.query("COMMIT")
    }
    catch(error) {
       await client.query("ROLLBACK")
       throw error
    }
    finally{
       client.release()
    }
}


const moveOrder = async (orderId: number, from: string, to: string) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `SELECT status FROM orders WHERE id = $1 FOR UPDATE`,
            [orderId]
        );
        const order = result.rows[0];

        if (!order){ 
            throw new AppError("Order not found", 404)
        };

        if (order.status !== from) {
            throw new AppError(`Order must be ${from} to become ${to}. It is ${order.status}.`, 409);
        }

        const updated = await client.query(
            `UPDATE orders SET status = $2 WHERE id = $1 RETURNING *`,
            [orderId, to]
        );

        await client.query(
            `INSERT INTO order_status_history (order_id, status) VALUES ($1, $2)`,
            [orderId, to]
        );

        await client.query("COMMIT");
        return updated.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const confirmOrder = (id: number) => 
                   moveOrder(id, 
                   "pending", 
                   "confirmed");

export const processOrder = (id: number) => 
                    moveOrder(id, 
                    "confirmed", 
                    "processing");

export const shipOrder    = (id: number) => 
                    moveOrder(id, 
                    "processing", 
                    "shipped");
export const deliverOrder = (id: number) => 
                    moveOrder(id, 
                    "shipped", 
                    "delivered");
import pool from "../db/db.js";
import { AppError } from "../errors/AppError.js";
import { invalidateProductCache } from "./product-cache.service.js";
import { withTransaction } from "../db/withTransaction.js";
import { OrderStatus } from "../types/order.types.js";

type CheckoutData = {
    userId: number;
    shipping_address: string;
    payment_method: "card" | "bank_transfer" | "cash_on_delivery";
};

export const checkout = async (data: CheckoutData) => {
    const order = await withTransaction(async (client) => {
        const cartResult = await client.query(
            `SELECT cart_id
             FROM carts
             WHERE user_id = $1
             FOR UPDATE`,
            [data.userId]
        );

        const cart = cartResult.rows[0];

        if (!cart) {
            throw new AppError("Cart not found", 404);
        }

        const itemsResult = await client.query(
            `SELECT
                ci.product_id,
                ci.quantity
             FROM cart_items ci
             WHERE ci.cart_id = $1
             ORDER BY ci.product_id
             FOR UPDATE`,
            [cart.cart_id]
        );

        const cartItems = itemsResult.rows;

        if (cartItems.length === 0) {
            throw new AppError("Cart is empty", 400);
        }

        const productIds = cartItems.map((item) => item.product_id);

        const productsResult = await client.query(
            `SELECT
                id,
                name,
                price,
                stock,
                is_active
             FROM products
             WHERE id = ANY($1::int[])
             ORDER BY id
             FOR UPDATE`,
            [productIds]
        );

        const products = productsResult.rows;

        if (products.length !== cartItems.length) {
            throw new AppError("One or more products are no longer available", 409);
        }

        const productsById = new Map(products.map((product) => [product.id, product]));

        for (const item of cartItems) {
            const product = productsById.get(item.product_id);

            if (!product || !product.is_active) {
                throw new AppError(`Product ${item.product_id} is no longer available`, 409);
            }

            if (item.quantity > product.stock) {
                throw new AppError(`Insufficient stock for ${product.name}`, 409);
            }
        }

        const orderResult = await client.query(
            `INSERT INTO orders (
                user_id,
                status,
                total,
                shipping_address
             )
             VALUES ($1, 'pending', 0, $2)
             RETURNING id`,
            [data.userId, data.shipping_address]
        );

        const orderId = orderResult.rows[0].id;

        await client.query(
            `INSERT INTO order_items (
                order_id,
                product_id,
                quantity,
                unit_price
             )
             SELECT
                $1,
                ci.product_id,
                ci.quantity,
                p.price
             FROM cart_items ci
             JOIN products p ON p.id = ci.product_id
             WHERE ci.cart_id = $2`,
            [orderId, cart.cart_id]
        );

        const stockResult = await client.query(
            `UPDATE products p
             SET stock = p.stock - oi.quantity
             FROM order_items oi
             WHERE oi.order_id = $1
               AND oi.product_id = p.id
               AND p.stock >= oi.quantity
             RETURNING p.id`,
            [orderId]
        );

        const changedIds: number[] = stockResult.rows.map((row) => row.id);

        if (changedIds.length !== cartItems.length) {
            throw new AppError("Stock changed during checkout. Please try again.", 409);
        }

        const totalResult = await client.query(
            `UPDATE orders
             SET total = (
                 SELECT COALESCE(
                     SUM(quantity * unit_price),
                     0
                 )
                 FROM order_items
                 WHERE order_id = $1
             )
             WHERE id = $1
             RETURNING *`,
            [orderId]
        );

        const createdOrder = totalResult.rows[0];

        if (!createdOrder) {
            throw new AppError("Failed to calculate order total", 500);
        }

        await client.query(
            `INSERT INTO payments (
                order_id,
                amount,
                status,
                payment_method
             )
             VALUES ($1, $2, 'pending', $3)`,
            [orderId, createdOrder.total, data.payment_method]
        );

        await client.query(
            `INSERT INTO order_status_history (
                order_id,
                status
             )
             VALUES ($1, 'pending')`,
            [orderId]
        );

        await client.query(
            `DELETE FROM cart_items
             WHERE cart_id = $1`,
            [cart.cart_id]
        );

        return {
            order: createdOrder,
            changedIds,
        };
    });

    try {
        await invalidateProductCache(order.changedIds);
    } catch (error) {
        console.error("Product cache invalidation failed after checkout:", error);
    }

    return order.order;
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
        `
        SELECT * 
        FROM orders 
        WHERE id = $1 
        AND user_id = $2`,
        [orderId, userId]
    );

    const order = orderResult.rows[0];

    if (!order) {
        throw new AppError("Order not found", 404);
    }

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
        items: itemsResult.rows,
    };
};

export const deleteOrder = async (orderId: number) => {
    return withTransaction(async (client) => {
        const result = await client.query(
            `SELECT id, status
             FROM orders
             WHERE id = $1
             FOR UPDATE`,
            [orderId]
        );

        const order = result.rows[0];

        if (!order) {
            throw new AppError("Order not found", 404);
        }

        if (order.status !== "cancelled") {
            throw new AppError("Only cancelled orders can be deleted", 409);
        }

        await client.query(`DELETE FROM payments WHERE order_id = $1`, [orderId]);

        await client.query(`DELETE FROM order_items WHERE order_id = $1`, [orderId]);

        await client.query(`DELETE FROM order_status_history WHERE order_id = $1`, [orderId]);

        await client.query(`DELETE FROM orders WHERE id = $1`, [orderId]);

        return {
            message: "Order deleted successfully",
            orderId,
        };
    });
};

const moveOrder = async (orderId: number, from: OrderStatus, to: OrderStatus) => {
    return withTransaction(async (client) => {
        // 1. Lock the order.
        const result = await client.query(
            `SELECT id, status
             FROM orders
             WHERE id = $1
             FOR UPDATE`,
            [orderId]
        );

        const order = result.rows[0];

        if (!order) {
            throw new AppError("Order not found", 404);
        }

        // 2. Validate the current status.
        if (order.status !== from) {
            throw new AppError(
                `Order must be ${from} to become ${to}. It is ${order.status}.`,
                409
            );
        }

        // 3. Validate payment before shipping.
        if (to === "shipped") {
            const paymentResult = await client.query(
                `SELECT status, payment_method
                 FROM payments
                 WHERE order_id = $1
                 FOR UPDATE`,
                [orderId]
            );

            const payment = paymentResult.rows[0];

            if (!payment) {
                throw new AppError("Payment record not found", 500);
            }

            const canShip =
                payment.payment_method === "cash_on_delivery" || payment.status === "paid";

            if (!canShip) {
                throw new AppError("Payment is required before this order can be shipped", 409);
            }
        }

        // 4. Update order status.
        const updatedResult = await client.query(
            `UPDATE orders
             SET status = $2
             WHERE id = $1
             RETURNING *`,
            [orderId, to]
        );

        // 5. Mark COD payment as paid upon delivery.
        if (to === "delivered") {
            const paymentUpdate = await client.query(
                `UPDATE payments
                 SET status = 'paid'
                 WHERE order_id = $1
                   AND payment_method = 'cash_on_delivery'
                   AND status = 'pending'
                 RETURNING id`,
                [orderId]
            );

            if (paymentUpdate.rows.length === 0) {
                const paymentCheck = await client.query(
                    `SELECT status, payment_method
                     FROM payments
                     WHERE order_id = $1`,
                    [orderId]
                );

                const payment = paymentCheck.rows[0];

                if (
                    !payment ||
                    payment.payment_method !== "cash_on_delivery" ||
                    payment.status !== "paid"
                ) {
                    throw new AppError("Unable to confirm cash on delivery payment", 409);
                }
            }
        }

        // 6. Record status history.
        await client.query(
            `INSERT INTO order_status_history (order_id, status)
             VALUES ($1, $2)`,
            [orderId, to]
        );

        return updatedResult.rows[0];
    });
};

export const confirmOrder = (id: number) => moveOrder(id, "pending", "confirmed");

export const processOrder = (id: number) => moveOrder(id, "confirmed", "processing");

export const shipOrder = (id: number) => moveOrder(id, "processing", "shipped");
export const deliverOrder = (id: number) => moveOrder(id, "shipped", "delivered");

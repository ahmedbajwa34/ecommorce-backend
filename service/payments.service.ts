import pool from "../db/db.js";
import { AppError } from "../errors/AppError.js";
import { withTransaction } from "../db/withTransaction.js";

export const payOrderService = async (orderId: number, userId: number) => {
    return withTransaction(async (client) => {
        // 1. Fetch and lock the order and payment.
        const result = await client.query(
            `SELECT
                o.id AS order_id,
                o.status AS order_status,
                p.id AS payment_id,
                p.status AS payment_status,
                p.payment_method
             FROM orders o
             JOIN payments p ON p.order_id = o.id
             WHERE o.id = $1
               AND o.user_id = $2
             FOR UPDATE OF o, p`,
            [orderId, userId]
        );

        const row = result.rows[0];

        if (!row) {
            throw new AppError("Order not found", 404);
        }

        const eligibleStatuses = ["pending", "confirmed"];

        if (!eligibleStatuses.includes(row.order_status)) {
            throw new AppError("Order is not eligible for payment", 409);
        }

        if (row.payment_method === "cash_on_delivery") {
            throw new AppError("Cash on delivery is paid when the order is delivered", 400);
        }

        if (row.payment_status !== "pending") {
            throw new AppError(`Payment is already ${row.payment_status}`, 409);
        }
        const updated = await client.query(
            `UPDATE payments
             SET status = 'paid'
             WHERE id = $1
               AND status = 'pending'
             RETURNING *`,
            [row.payment_id]
        );

        if (!updated.rows[0]) {
            throw new AppError("Payment could not be completed", 409);
        }

        return updated.rows[0];
    });
};

export const getPaymentByOrderservice = async (
    orderId: number,
    user: { id: number; role: string }
) => {
    const result = await pool.query(
        `SELECT p.*
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         WHERE p.order_id = $1 AND ($3 = 'admin' OR o.user_id = $2)`,
        [orderId, user.id, user.role]
    );

    if (result.rows.length === 0) {
        throw new AppError("Payment not found", 404);
    }
    return result.rows[0];
};

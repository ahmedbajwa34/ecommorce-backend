import pool from "../db/db.js";
import { AppError } from "../errors/AppError.js";

export const payOrderservice = async (orderId: number, userId: number) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `SELECT o.status AS order_status,
                    p.id AS payment_id,
                    p.status AS payment_status,
                    p.payment_method
             FROM orders o
             JOIN payments p ON p.order_id = o.id
             WHERE o.id = $1 AND o.user_id = $2
             FOR UPDATE OF p`,
            [orderId, userId]
        );
        const row = result.rows[0];

        if (!row) {
            throw new AppError("Order not found", 404);
        }
        if (row.order_status === "cancelled") {
            throw new AppError("Order is cancelled", 409);
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
             RETURNING *`,
            [row.payment_id]
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

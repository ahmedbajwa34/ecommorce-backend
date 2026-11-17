import type Stripe from "stripe";
import type { PoolClient } from "pg";
import pool from "../db/db.js";
import { AppError } from "../errors/AppError.js";
import { withTransaction } from "../db/withTransaction.js";
import { getStripe } from "./stripe.js";

const CURRENCY = "usd";
const MIN_CHARGE_CENTS = 50;

// Intent statuses where the customer can still pay with the same intent.
const OPEN_INTENT_STATUSES = ["requires_payment_method", "requires_confirmation", "requires_action"];

// Columns that are safe to return to API clients.
const PAYMENT_COLUMNS = "id, order_id, amount, status, payment_method";

// Compare what Stripe collected with what we expected. Amounts are compared in
// cents as integers; the SQL side computes cents so no float math is involved.
const matchesIntent = (amountCents: string | number, intent: Stripe.PaymentIntent) =>
    intent.amount_received === Number(amountCents) && intent.currency === CURRENCY;

// Idempotent: only moves pending/failed -> paid. A failed payment can still be
// paid later because Stripe lets the customer retry the same intent.
const markPaid = async (client: PoolClient, paymentId: number) => {
    const updated = await client.query(
        `UPDATE payments
         SET status = 'paid'
         WHERE id = $1 AND status IN ('pending', 'failed')
         RETURNING ${PAYMENT_COLUMNS}`,
        [paymentId]
    );
    return updated.rows[0] ?? null;
};

const lockPaymentByIntent = async (client: PoolClient, intentId: string) => {
    const result = await client.query(
        `SELECT id, status, ROUND(amount * 100)::bigint AS amount_cents
         FROM payments
         WHERE stripe_payment_intent_id = $1
         FOR UPDATE`,
        [intentId]
    );
    return result.rows[0] as { id: number; status: string; amount_cents: string } | undefined;
};

// NOTE: Stripe is called while the row locks are held. That keeps the example
// simple and correct; a production system would call Stripe outside the
// transaction and rely on the idempotency keys below.
export const createCardPaymentIntent = async (orderId: number, userId: number) => {
    const stripe = getStripe(); // fail fast (503) before taking a DB connection

    return withTransaction(async (client) => {
        // Lock BOTH rows so a concurrent cancel (which locks the order) cannot
        // slip in between this check and the payment update.
        const result = await client.query(
            `SELECT o.status AS order_status,
                    p.id AS payment_id,
                    p.status AS payment_status,
                    p.payment_method,
                    p.stripe_payment_intent_id,
                    ROUND(p.amount * 100)::bigint AS amount_cents
             FROM orders o
             JOIN payments p ON p.order_id = o.id
             WHERE o.id = $1 AND o.user_id = $2
             FOR UPDATE OF o, p`,
            [orderId, userId]
        );
        const row = result.rows[0];

        if (!row) {
            throw new AppError("Order not found", 404);
        }
        if (!["pending", "confirmed"].includes(row.order_status)) {
            throw new AppError("Order is not eligible for payment", 409);
        }
        if (row.payment_method !== "card") {
            throw new AppError("This order is not set up for card payment", 400);
        }
        if (row.payment_status === "paid") {
            throw new AppError("Payment is already paid", 409);
        }
        // 'failed' is retryable; anything else (e.g. refunded) is not.
        if (!["pending", "failed"].includes(row.payment_status)) {
            throw new AppError(`Payment is already ${row.payment_status}`, 409);
        }

        const cents = Number(row.amount_cents);
        if (!Number.isFinite(cents) || cents < MIN_CHARGE_CENTS) {
            throw new AppError("Order total is too small to charge with card", 400);
        }

        if (row.stripe_payment_intent_id) {
            const existing = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id);

            if (existing.status === "succeeded") {
                // Paid at Stripe but our webhook has not landed yet.
                if (!matchesIntent(cents, existing)) {
                    throw new AppError("Payment amount does not match the order", 409);
                }
                await markPaid(client, row.payment_id);
                return { clientSecret: existing.client_secret, alreadyPaid: true };
            }

            if (existing.status === "processing") {
                // Never create a second intent while the first may still succeed.
                throw new AppError("Payment is still processing. Please wait a moment.", 409);
            }

            if (OPEN_INTENT_STATUSES.includes(existing.status)) {
                await client.query(
                    `UPDATE payments SET status = 'pending' WHERE id = $1 AND status = 'failed'`,
                    [row.payment_id]
                );
                return { clientSecret: existing.client_secret, alreadyPaid: false };
            }

            if (existing.status !== "canceled") {
                throw new AppError(`Payment cannot be started (${existing.status})`, 409);
            }
            // canceled: fall through and create a fresh intent.
        }

        // The key changes after a canceled intent (it includes the old intent id),
        // so a retry of the same request reuses the intent but a replacement works.
        const intent = await stripe.paymentIntents.create(
            {
                amount: cents,
                currency: CURRENCY,
                automatic_payment_methods: { enabled: true },
                metadata: {
                    orderId: String(orderId),
                    paymentId: String(row.payment_id),
                    userId: String(userId),
                },
            },
            {
                idempotencyKey: `order-${orderId}-payment-${row.payment_id}-after-${
                    row.stripe_payment_intent_id ?? "none"
                }`,
            }
        );

        await client.query(
            `UPDATE payments
             SET stripe_payment_intent_id = $2, status = 'pending'
             WHERE id = $1`,
            [row.payment_id, intent.id]
        );

        return { clientSecret: intent.client_secret, alreadyPaid: false };
    });
};

// Called by the client after paying. It never trusts the client: it asks Stripe.
export const confirmCardPayment = async (orderId: number, userId: number) => {
    const stripe = getStripe();

    return withTransaction(async (client) => {
        const result = await client.query(
            `SELECT p.id AS payment_id,
                    p.status AS payment_status,
                    p.stripe_payment_intent_id,
                    ROUND(p.amount * 100)::bigint AS amount_cents
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

        if (row.payment_status === "paid") {
            const paid = await client.query(`SELECT ${PAYMENT_COLUMNS} FROM payments WHERE id = $1`, [
                row.payment_id,
            ]);
            return paid.rows[0];
        }

        if (!row.stripe_payment_intent_id) {
            throw new AppError("No Stripe payment has been started for this order", 400);
        }

        const intent = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id);
        if (intent.status !== "succeeded") {
            throw new AppError(`Payment is not complete yet (${intent.status})`, 409);
        }
        if (!matchesIntent(row.amount_cents, intent)) {
            throw new AppError("Payment amount does not match the order", 409);
        }

        const updated = await markPaid(client, row.payment_id);
        if (updated) {
            return updated;
        }

        const current = await client.query(`SELECT ${PAYMENT_COLUMNS} FROM payments WHERE id = $1`, [
            row.payment_id,
        ]);
        return current.rows[0];
    });
};

export const handleStripeWebhook = async (payload: Buffer, signature: string) => {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
        throw new AppError("Stripe webhook secret is not configured", 503);
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(payload, signature, secret);
    } catch {
        throw new AppError("Invalid Stripe signature", 400);
    }

    // Every branch is idempotent: Stripe retries events and may deliver them
    // out of order, so we only ever apply a valid state transition.
    switch (event.type) {
        case "payment_intent.succeeded": {
            const intent = event.data.object as Stripe.PaymentIntent;
            await withTransaction(async (client) => {
                const payment = await lockPaymentByIntent(client, intent.id);
                if (!payment || !["pending", "failed"].includes(payment.status)) {
                    return; // unknown intent, or already paid/refunded
                }
                if (!matchesIntent(payment.amount_cents, intent)) {
                    // Respond 200 so Stripe stops retrying, but leave a trail to review.
                    console.error(
                        `Stripe amount mismatch for payment ${payment.id}: ` +
                            `expected ${payment.amount_cents} ${CURRENCY}, ` +
                            `got ${intent.amount_received} ${intent.currency}`
                    );
                    return;
                }
                await markPaid(client, payment.id);
            });
            break;
        }

        case "payment_intent.payment_failed": {
            const intent = event.data.object as Stripe.PaymentIntent;
            await withTransaction(async (client) => {
                const payment = await lockPaymentByIntent(client, intent.id);
                // Only pending -> failed, so a late "failed" event can never
                // overwrite a payment that has already succeeded.
                if (payment?.status === "pending") {
                    await client.query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [
                        payment.id,
                    ]);
                }
            });
            break;
        }

        case "charge.refunded": {
            const charge = event.data.object as Stripe.Charge;
            const intentId =
                typeof charge.payment_intent === "string"
                    ? charge.payment_intent
                    : charge.payment_intent?.id;

            // charge.refunded is also sent for partial refunds; only a full refund
            // moves the payment to 'refunded'.
            if (!intentId || !charge.refunded) {
                break;
            }

            await withTransaction(async (client) => {
                const payment = await lockPaymentByIntent(client, intentId);
                if (payment?.status === "paid") {
                    await client.query(`UPDATE payments SET status = 'refunded' WHERE id = $1`, [
                        payment.id,
                    ]);
                }
            });
            break;
        }

        default:
            break;
    }

    return { received: true };
};

export const getPaymentByOrderservice = async (
    orderId: number,
    user: { id: number; role: string }
) => {
    const result = await pool.query(
        `SELECT p.id, p.order_id, p.amount, p.status, p.payment_method, p.stripe_payment_intent_id
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
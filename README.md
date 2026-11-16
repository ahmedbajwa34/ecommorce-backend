

# E-Commerce Backend API

A REST API for an online store, built with **Node.js, Express 5, TypeScript and PostgreSQL**. It covers authentication, a product catalogue, shopping carts, orders and card payments (Stripe, test mode).

The focus of the project is correctness under concurrency: checkout, stock and payments are handled with database transactions, row-level locks and idempotent webhooks.

## Features

- **Auth:** register, login, logout and token refresh with JWT access and refresh tokens (stored in cookies), bcrypt password hashing, and `customer` / `admin` roles.
- **Catalogue:** categories and products, with Redis caching and cache invalidation after stock changes.
- **Cart:** add, update and remove items; one cart per user.
- **Checkout:** one transaction creates the order, order items and payment record, decrements stock and clears the cart.
- **Order lifecycle:** `pending → confirmed → processing → shipped → delivered`, with a status history table. Admin only.
- **Payments:** card, bank transfer and cash on delivery. Card payments use Stripe PaymentIntents with a signature-verified webhook.
- **Security and hygiene:** Zod request validation, parameterized SQL, rate limiting per route, Helmet, CORS, and centralized error handling.

## Tech stack

| Area | Tools |
|---|---|
| Runtime / language | Node.js, TypeScript, Express 5 |
| Database | PostgreSQL via `pg` (no ORM, plain SQL) |
| Cache | Redis |
| Payments | Stripe (PaymentIntents + webhooks, test mode) |
| Validation / security | Zod, JWT, bcrypt, Helmet, express-rate-limit |

## Project structure

```
app.ts                 App setup, middleware order, route mounting
routes/                Route definitions
controllers/           HTTP layer: parse input, call services, send responses
service/               Business logic and SQL (checkout, payments, cart, products, tokens)
middleware/            auth, role checks, validation, rate limits, error handler
schema/                Zod schemas
db/                    Postgres pool, withTransaction helper, Redis client, schema.sql
cache/                 Cache key helpers
errors/                AppError class
```

## Getting started

### 1. Prerequisites

- Node.js (a recent LTS version) and npm
- PostgreSQL
- Redis
- A free Stripe account in **test mode** and the Stripe CLI (only needed for card payments)

### 2. Install

```bash
git clone <your-repo-url>
cd <your-repo-folder>
npm install
```

### 3. Create the database

Create an empty database, then load the schema (it also adds a few demo products):

```bash
createdb -U <user> ecommerce
psql -U <user> -d ecommerce -f db/schema.sql
```

### 4. Configure environment variables

Copy `.env.example` to `.env` and fill in the values (database credentials, two different JWT secrets, Stripe keys). `.env` is git-ignored.

### 5. Run

```bash
npm run dev
```

The API listens on `http://localhost:3000`. Health check: `GET /api/health`.

Other scripts: `npm run build` (compile to `dist/`), `npm start` (run the compiled build), `npm run format`.

### Optional: Postgres and Redis with Docker

If you have Docker, `docker compose up -d` starts Postgres and Redis and loads `db/schema.sql` on first start. They use host ports `5433` and `6380`, so set `DB_PORT=5433` and `REDIS_URL=redis://localhost:6380` in `.env`.

## Making users admins

New users are `customer`s. Register through the API, then promote one:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

## API overview

All routes are under `/api`. Authentication uses cookies set by `/login`, so use a client that keeps cookies (for example Postman).

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/register` | public | Create an account |
| POST | `/login` | public | Log in (sets cookies) |
| POST | `/auth/refresh` | cookie | Refresh the access token |
| POST | `/logout` | any | Clear cookies |
| GET | `/products`, `/products/:id` | logged in | List / view products |
| POST | `/products` | logged in | Create a product |
| PATCH | `/products/:id` | admin | Update a product |
| GET / POST | `/categories` | logged in / admin | List / create categories |
| GET | `/cart` | logged in | View cart |
| POST | `/cart/items` | logged in | Add item `{ product_id, quantity }` |
| PATCH | `/cart/items/:product_id` | logged in | Change quantity |
| DELETE | `/cartItem/:product_id`, `/cart` | logged in | Remove an item / empty the cart |
| POST | `/placeOrder` | customer | Checkout `{ shipping_address, payment_method }` |
| GET | `/orders`, `/order/:id` | logged in | List / view your orders |
| PATCH | `/orders/:id/confirm`, `/process`, `/ship`, `/deliver` | admin | Move an order through its lifecycle |
| DELETE | `/orders/:id` | admin | Delete a cancelled order |
| POST | `/orders/:id/pay` | customer | Create a Stripe PaymentIntent for a card order |
| POST | `/orders/:id/pay/confirm` | customer | Verify payment status with Stripe |
| GET | `/orders/:id/payment` | owner / admin | View the payment record |
| GET | `/payments/config` | public | Stripe publishable key |
| POST | `/webhooks/stripe` | Stripe signature | Stripe webhook receiver |

`payment_method` is one of `card`, `bank_transfer`, `cash_on_delivery`.

## Design decisions

**Checkout is one transaction.** It locks the cart, cart items and products (`SELECT ... FOR UPDATE`), validates stock, creates the order, order items and payment, decrements stock and clears the cart. Any failure rolls everything back.

**Rows are locked in a consistent order** (`ORDER BY id`), which helps avoid deadlocks between concurrent checkouts.

**Overselling is prevented twice.** Stock is checked under a lock, and the stock `UPDATE` is guarded with `stock >= quantity`. If the number of updated rows doesn't match the cart, checkout aborts.

**Order lifecycle is a small state machine.** Each transition locks the order row and verifies the current status. An order can't ship until its payment is `paid`, unless it's cash on delivery. Every change is recorded in `order_status_history`.

**Stripe webhooks are the source of truth.** The browser can disconnect after paying, so the server marks a payment `paid` only when Stripe tells it so.
- The webhook verifies Stripe's signature (it needs the raw request body, so it is mounted before `express.json()`).
- It checks that the amount received and the currency match the payment.
- It only applies valid status transitions, so retried or out-of-order events are harmless: `pending/failed → paid`, `pending → failed`, `paid → refunded`.
- PaymentIntents are created with an idempotency key, and an existing intent is reused instead of creating a duplicate.

**Redis is a cache, not a requirement for correctness.** Product cache entries are invalidated after checkout. If invalidation fails, the checkout still succeeds and the error is logged.

**Money is stored as `NUMERIC(10,2)`** and converted to integer cents in SQL before talking to Stripe.

## Testing the payment flow (Stripe test mode)

1. Put your test keys in `.env` (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`).
2. Forward webhooks to your local server:
   ```bash
   stripe listen --events "payment_intent.succeeded,payment_intent.payment_failed,charge.refunded" --forward-to localhost:3000/api/webhooks/stripe
   ```
   Put the printed `whsec_...` value in `.env` as `STRIPE_WEBHOOK_SECRET` and restart the app.
3. Register and log in, add a product to the cart, then `POST /placeOrder` with `"payment_method": "card"`.
4. Call `POST /orders/<id>/pay` and read the `pi_...` id from the `payments` table.
5. Pay with a Stripe test card:
   ```bash
   stripe payment_intents confirm pi_XXXX --payment-method pm_card_visa --return-url https://example.com
   ```
   The payment status becomes `paid`. Use `pm_card_chargeDeclined` to see the `failed` path.

## Known limitations

- No automated test suite yet. The flows above were tested manually with Postman and the Stripe CLI.
- Card payments are tested in Stripe **test mode** only, and the currency is fixed to USD.
- Partial refunds are ignored; only full refunds change a payment to `refunded`.
- Unpaid pending orders keep their stock reserved; there is no expiry job.
- The server port is currently fixed at 3000.



Portfolio ecommerce: Express + TypeScript API, Postgres, Redis, Stripe, and a React storefront.

## What you can do

- Create an account, sign in with httpOnly cookies
- Browse products, add to cart, place an order
- Pay with **Stripe** (card) or cash on delivery
- Admin studio: add products/categories and move orders through confirm → process → ship → deliver

## Setup

1. Install **PostgreSQL** and **Redis**.
2. Create a database, then load the schema (new project) or only the Stripe migration (existing database):

```bash
psql -d ecommerce -f db/schema.sql
# existing database only:
psql -d ecommerce -f db/migrate-stripe.sql
```

3. Copy `.env.example` to `.env` and fill in DB, Redis, JWT, and Stripe keys.
4. Install and run the API:

```bash
npm install
npm run dev
```

5. Install and run the storefront (proxies `/api` to port 3000):

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Stripe

Use test keys from the Stripe dashboard.

- `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` are enough for local card payments. After the browser confirms, the API asks Stripe if the PaymentIntent succeeded and marks the order paid.
- `STRIPE_WEBHOOK_SECRET` is optional locally. Endpoint: `POST /api/webhooks/stripe`.

Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

## Admin

New accounts are customers. Promote one user in Postgres:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Then sign out and sign in again so the access token picks up the role.

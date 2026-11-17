CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,

    name          VARCHAR(60)  NOT NULL,

    email         VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT         NOT NULL,

    role          VARCHAR(20)  NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()

);



CREATE TABLE IF NOT EXISTS categories (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL

);



CREATE TABLE IF NOT EXISTS products (

    id          SERIAL PRIMARY KEY,

    name        VARCHAR(200)   NOT NULL,

    description TEXT           NOT NULL,
    price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),

    stock       INTEGER        NOT NULL CHECK (stock >= 0),

    category_id INTEGER        NOT NULL REFERENCES categories(id),

    is_active   BOOLEAN        NOT NULL DEFAULT TRUE,

    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (name, category_id)

);


CREATE TABLE IF NOT EXISTS carts (
    cart_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id)

);

CREATE TABLE IF NOT EXISTS cart_items (

    id         SERIAL PRIMARY KEY,
    cart_id    INTEGER NOT NULL REFERENCES carts(cart_id),

    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity   INTEGER NOT NULL CHECK (quantity > 0),

    UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (

    id               SERIAL PRIMARY KEY,
    user_id          INTEGER        NOT NULL REFERENCES users(id),
    status           VARCHAR(20)    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'processing',
                                       'shipped', 'delivered', 'cancelled')),
    total            NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),

    shipping_address VARCHAR(255)   NOT NULL,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()

);



CREATE TABLE IF NOT EXISTS order_items (

    id         SERIAL PRIMARY KEY,

    order_id   INTEGER        NOT NULL REFERENCES orders(id),

    product_id INTEGER        NOT NULL REFERENCES products(id),

    quantity   INTEGER        NOT NULL CHECK (quantity > 0),

    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),

    UNIQUE (order_id, product_id)
);

-- One payment row per order.

CREATE TABLE IF NOT EXISTS payments (
    id                       SERIAL PRIMARY KEY,
    order_id                 INTEGER        UNIQUE NOT NULL REFERENCES orders(id),
    amount                   NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    status                   VARCHAR(20)    NOT NULL DEFAULT 'pending'

                             CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_method           VARCHAR(30)    NOT NULL

                             CHECK (payment_method IN ('card', 'bank_transfer', 'cash_on_delivery')),
    stripe_payment_intent_id TEXT UNIQUE
);



CREATE TABLE IF NOT EXISTS order_status_history (
    id  SERIAL PRIMARY KEY,
    order_id  INTEGER NOT NULL REFERENCES orders(id),
    status VARCHAR(20) NOT NULL
               CHECK (status IN ('pending', 'confirmed', 'processing',
                                 'shipped', 'delivered', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Indexes (UNIQUE constraints above already index their own columns).
CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category_id);

CREATE INDEX IF NOT EXISTS idx_products_price       ON products(price);

CREATE INDEX IF NOT EXISTS idx_products_created     ON products(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_cart_items_product   ON cart_items(product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product  ON order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_created  ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_order ON order_status_history(order_id);



-- Demo data. Prices are in USD because card payments use the "usd" currency.

-- Admin users cannot be seeded here (passwords are bcrypt hashes): register a

-- user through the API, then run:

--   UPDATE users SET role = 'admin' WHERE email = 'you@example.com';

INSERT INTO categories (name) VALUES
    ('Lighting'),
    ('Desk'),
    ('Kitchen')
ON CONFLICT (name) DO NOTHING;
INSERT INTO products (name, description, price, stock, category_id)
SELECT p.name, p.description, p.price, p.stock, c.id
FROM (VALUES
    ('Brass Desk Lamp',     'A weighted brass lamp with a linen shade. Warm, not precious.',           89.00, 24, 'Lighting'),
    ('Paper Shade Pendant', 'Handmade washi shade. Soft light for a dining table or reading corner.',  64.00, 18, 'Lighting'),

    ('Oak Catch-All Tray',  'A small tray for keys, pens, and the mail you mean to open.',             32.00, 40, 'Desk'),
    ('Linen Notebook Set',  'Three A5 notebooks with numbered pages and a stitched spine.',            28.00, 50, 'Desk'),
    ('Stoneware Pourer',    'A 350ml pourer for oil or coffee. Matte glaze, heavy in the hand.',       42.00, 22, 'Kitchen'),
    ('Beech Cutting Board', 'End-grain board, 40cm. Oil it once a month and it will outlast you.',     76.00, 15, 'Kitchen')
) AS p(name, description, price, stock, category)
JOIN categories c ON c.name = p.category
ON CONFLICT (name, category_id) DO NOTHING;
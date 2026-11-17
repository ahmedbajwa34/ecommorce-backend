import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, type Category, type Product } from "../api";

export function Home() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [active, setActive] = useState<number | "all">("all");
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([api.products(), api.categories()])
            .then(([productRes, categoryRes]) => {
                setProducts(productRes.data);
                setCategories(categoryRes.data);
            })
            .catch((err: Error) => setError(err.message));
    }, []);

    const visible = useMemo(
        () => (active === "all" ? products : products.filter((item) => item.category_id === active)),
        [products, active]
    );

    return (
        <>
            <section className="hero">
                <div>
                    <p className="kicker">A small shop of useful things</p>
                    <h1>Quiet objects for everyday rooms.</h1>
                    <p className="muted">
                        Lamps, trays, boards, and notebooks chosen because they feel good in the hand — not
                        because they shout from a shelf.
                    </p>
                </div>
                <div className="hero-card">
                    <p className="kicker" style={{ color: "#e8d5b5" }}>
                        How it works
                    </p>
                    <p>Browse, add to cart, check out. Pay with card through Stripe, or choose cash on delivery.</p>
                    <p className="muted" style={{ color: "#cbbfaa" }}>
                        Stock is reserved when you place the order, not when you browse.
                    </p>
                </div>
            </section>

            <div className="actions" style={{ marginBottom: 18 }}>
                <button
                    className={active === "all" ? "btn" : "btn secondary"}
                    onClick={() => setActive("all")}
                >
                    All
                </button>
                {categories.map((category) => (
                    <button
                        key={category.id}
                        className={active === category.id ? "btn" : "btn secondary"}
                        onClick={() => setActive(category.id)}
                    >
                        {category.name}
                    </button>
                ))}
            </div>

            {error && <p className="flash">{error}</p>}

            {visible.length === 0 ? (
                <div className="empty">Nothing on the floor yet. Check back after the studio restocks.</div>
            ) : (
                <div className="grid">
                    {visible.map((product) => (
                        <Link to={`/products/${product.id}`} className="card" key={product.id}>
                            <p className="kicker">In stock · {product.stock}</p>
                            <h3>{product.name}</h3>
                            <p className="muted">{product.description}</p>
                            <p className="price">{money(product.price)}</p>
                        </Link>
                    ))}
                </div>
            )}
        </>
    );
}

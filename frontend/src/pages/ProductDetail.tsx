import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, money, type Product } from "../api";
import { useAuth } from "../AuthContext";

export function ProductDetail() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [product, setProduct] = useState<Product | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        api.product(Number(id))
            .then((res) => setProduct(res.data))
            .catch((err: Error) => setError(err.message));
    }, [id]);

    if (error) {
        return <div className="panel flash">{error}</div>;
    }
    if (!product) {
        return <div className="empty">Loading…</div>;
    }

    return (
        <section className="panel">
            <p className="kicker">Product</p>
            <h1>{product.name}</h1>
            <p className="muted">{product.description}</p>
            <p className="price">{money(product.price)}</p>
            <p className="muted">{product.stock} available</p>
            <div className="actions" style={{ marginTop: 18 }}>
                <input
                    type="number"
                    min={1}
                    max={product.stock}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    style={{ width: 90 }}
                />
                <button
                    className="btn accent"
                    onClick={async () => {
                        if (!user) {
                            navigate("/login");
                            return;
                        }
                        try {
                            await api.addToCart(product.id, quantity);
                            setMessage("Added to cart");
                            setError("");
                        } catch (err) {
                            setError(err instanceof Error ? err.message : "Could not add to cart");
                        }
                    }}
                >
                    Add to cart
                </button>
            </div>
            {message && <p className="flash ok">{message}</p>}
            {error && <p className="flash">{error}</p>}
        </section>
    );
}

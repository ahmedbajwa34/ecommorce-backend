import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, type CartItem } from "../api";

export function CartPage() {
    const [items, setItems] = useState<CartItem[]>([]);
    const [error, setError] = useState("");

    const load = () =>
        api
            .cart()
            .then((res) => setItems(res.data.items))
            .catch((err: Error) => setError(err.message));

    useEffect(() => {
        void load();
    }, []);

    const total = useMemo(
        () => items.reduce((sum, item) => sum + Number(item.line_total), 0),
        [items]
    );

    return (
        <section className="panel">
            <h1>Cart</h1>
            {error && <p className="flash">{error}</p>}
            {items.length === 0 ? (
                <p className="empty">Your cart is empty.</p>
            ) : (
                <>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Total</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        {item.name}
                                        <div className="muted">{money(item.price)}</div>
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            min={1}
                                            value={item.quantity}
                                            style={{ width: 80 }}
                                            onChange={async (event) => {
                                                try {
                                                    await api.updateCartItem(
                                                        item.product_id,
                                                        Number(event.target.value)
                                                    );
                                                    await load();
                                                } catch (err) {
                                                    setError(
                                                        err instanceof Error ? err.message : "Update failed"
                                                    );
                                                }
                                            }}
                                        />
                                    </td>
                                    <td>{money(item.line_total)}</td>
                                    <td>
                                        <button
                                            className="btn secondary"
                                            onClick={async () => {
                                                await api.removeCartItem(item.product_id);
                                                await load();
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="row">
                        <strong>Subtotal {money(total)}</strong>
                        <div className="actions">
                            <button
                                className="btn secondary"
                                onClick={async () => {
                                    await api.clearCart();
                                    await load();
                                }}
                            >
                                Empty cart
                            </button>
                            <Link className="btn accent" to="/checkout">
                                Checkout
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}

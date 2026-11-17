import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export function CheckoutPage() {
    const navigate = useNavigate();
    const [shipping_address, setAddress] = useState("");
    const [payment_method, setMethod] = useState<"card" | "cash_on_delivery">("card");
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setPending(true);
        setError("");
        try {
            const result = await api.placeOrder({ shipping_address, payment_method });
            if (payment_method === "card") {
                navigate(`/orders/${result.data.id}/pay`);
            } else {
                navigate(`/orders/${result.data.id}`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Checkout failed");
        } finally {
            setPending(false);
        }
    };

    return (
        <section className="panel">
            <p className="kicker">Checkout</p>
            <h1>Where should it go?</h1>
            <form className="form" onSubmit={onSubmit}>
                <label>
                    Shipping address
                    <textarea
                        required
                        minLength={8}
                        rows={4}
                        value={shipping_address}
                        onChange={(event) => setAddress(event.target.value)}
                    />
                </label>
                <label>
                    Payment
                    <select
                        value={payment_method}
                        onChange={(event) =>
                            setMethod(event.target.value as "card" | "cash_on_delivery")
                        }
                    >
                        <option value="card">Card with Stripe</option>
                        <option value="cash_on_delivery">Cash on delivery</option>
                    </select>
                </label>
                {error && <p className="flash">{error}</p>}
                <button className="btn" disabled={pending}>
                    {pending ? "Placing order…" : "Place order"}
                </button>
            </form>
        </section>
    );
}

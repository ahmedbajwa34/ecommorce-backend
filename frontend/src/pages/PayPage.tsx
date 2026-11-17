import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

function PayForm({ orderId }: { orderId: number }) {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!stripe || !elements) {
            return;
        }
        setPending(true);
        setError("");
        const result = await stripe.confirmPayment({
            elements,
            redirect: "if_required",
        });
        if (result.error) {
            setError(result.error.message || "Payment failed");
            setPending(false);
            return;
        }
        try {
            await api.confirmPay(orderId);
            navigate(`/orders/${orderId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not confirm payment");
            setPending(false);
        }
    };

    return (
        <form className="form" onSubmit={onSubmit}>
            <PaymentElement />
            {error && <p className="flash">{error}</p>}
            <button className="btn" disabled={!stripe || pending}>
                {pending ? "Paying…" : "Pay now"}
            </button>
        </form>
    );
}

export function PayPage() {
    const { id } = useParams();
    const orderId = Number(id);
    const [stripe, setStripe] = useState<Stripe | null>(null);
    const [clientSecret, setClientSecret] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                const [config, pay] = await Promise.all([api.config(), api.startPay(orderId)]);
                if (pay.data.alreadyPaid) {
                    navigate(`/orders/${orderId}`);
                    return;
                }
                if (!config.data.stripePublishableKey || !pay.data.clientSecret) {
                    throw new Error("Stripe is not configured on the server");
                }
                const loaded = await loadStripe(config.data.stripePublishableKey);
                setStripe(loaded);
                setClientSecret(pay.data.clientSecret);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not start payment");
            }
        })();
    }, [orderId, navigate]);

    if (error) {
        return <section className="panel flash">{error}</section>;
    }
    if (!stripe || !clientSecret) {
        return <div className="empty">Preparing secure payment…</div>;
    }

    return (
        <section className="panel">
            <p className="kicker">Stripe</p>
            <h1>Pay for order {orderId}</h1>
            <p className="muted">Use test card 4242 4242 4242 4242, any future date, any CVC.</p>
            <Elements stripe={stripe} options={{ clientSecret }}>
                <PayForm orderId={orderId} />
            </Elements>
        </section>
    );
}

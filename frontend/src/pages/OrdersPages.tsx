import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, money, type Order, type OrderItem, type Payment } from "../api";
import { useAuth } from "../AuthContext";

export function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        api.orders()
            .then((res) => setOrders(res.data))
            .catch((err: Error) => setError(err.message));
    }, []);

    return (
        <section className="panel">
            <h1>Orders</h1>
            {error && <p className="flash">{error}</p>}
            {orders.length === 0 ? (
                <p className="empty">No orders yet.</p>
            ) : (
                <table className="table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Status</th>
                            <th>Total</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id}>
                                <td>{order.id}</td>
                                <td>
                                    <span className="badge">{order.status}</span>
                                </td>
                                <td>{money(order.total)}</td>
                                <td>
                                    <Link to={`/orders/${order.id}`}>View</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </section>
    );
}

export function OrderDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [order, setOrder] = useState<Order | null>(null);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [payment, setPayment] = useState<Payment | null>(null);
    const [error, setError] = useState("");

    const orderId = Number(id);

    const load = async () => {
        const [orderRes, paymentRes] = await Promise.all([
            api.order(orderId),
            api.payment(orderId).catch(() => null),
        ]);
        setOrder(orderRes.data.order);
        setItems(orderRes.data.items);
        setPayment(paymentRes?.data ?? null);
    };

    useEffect(() => {
        load().catch((err: Error) => setError(err.message));
    }, [orderId]);

    if (error) {
        return <div className="panel flash">{error}</div>;
    }
    if (!order) {
        return <div className="empty">Loading…</div>;
    }

    return (
        <section className="panel">
            <p className="kicker">Order {order.id}</p>
            <h1>{money(order.total)}</h1>
            <p>
                <span className="badge">{order.status}</span>
            </p>
            <p className="muted">{order.shipping_address}</p>
            {payment && (
                <p>
                    Payment: {payment.payment_method.replaceAll("_", " ")} · {payment.status}
                </p>
            )}
            <table className="table">
                <tbody>
                    {items.map((item) => (
                        <tr key={item.product_id}>
                            <td>
                                {item.name} × {item.quantity}
                            </td>
                            <td>{money(item.line_total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {user?.role === "customer" && payment?.status === "pending" && payment.payment_method === "card" && (
                <Link className="btn accent" to={`/orders/${order.id}/pay`}>
                    Pay now
                </Link>
            )}
        </section>
    );
}

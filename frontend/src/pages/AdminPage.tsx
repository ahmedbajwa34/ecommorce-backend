import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, type Category, type Order } from "../api";

const nextAction: Record<string, { label: string; run: (id: number) => Promise<unknown> }> = {
    pending: { label: "Confirm", run: api.confirmOrder },
    confirmed: { label: "Process", run: api.processOrder },
    processing: { label: "Ship", run: api.shipOrder },
    shipped: { label: "Deliver", run: api.deliverOrder },
};

export function AdminPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [categoryName, setCategoryName] = useState("");
    const [product, setProduct] = useState({
        name: "",
        description: "",
        price: "",
        stock: "",
        category_id: "",
    });

    const load = async () => {
        const [orderRes, categoryRes] = await Promise.all([api.orders(), api.categories()]);
        setOrders(orderRes.data);
        setCategories(categoryRes.data);
    };

    useEffect(() => {
        load().catch((err: Error) => setError(err.message));
    }, []);

    const addCategory = async (event: FormEvent) => {
        event.preventDefault();
        try {
            await api.createCategory(categoryName);
            setCategoryName("");
            setMessage("Category added");
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not add category");
        }
    };

    const addProduct = async (event: FormEvent) => {
        event.preventDefault();
        try {
            await api.createProduct({
                name: product.name,
                description: product.description,
                price: Number(product.price),
                stock: Number(product.stock),
                category_id: Number(product.category_id),
            });
            setProduct({ name: "", description: "", price: "", stock: "", category_id: product.category_id });
            setMessage("Product added");
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not add product");
        }
    };

    return (
        <section className="panel">
            <p className="kicker">Studio</p>
            <h1>Catalog and fulfillment</h1>
            {error && <p className="flash">{error}</p>}
            {message && <p className="flash ok">{message}</p>}

            <h2>New category</h2>
            <form className="form" onSubmit={addCategory}>
                <input
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Category name"
                    required
                />
                <button className="btn secondary">Add category</button>
            </form>

            <h2>New product</h2>
            <form className="form" onSubmit={addProduct}>
                <input
                    value={product.name}
                    onChange={(e) => setProduct({ ...product, name: e.target.value })}
                    placeholder="Name"
                    required
                />
                <textarea
                    value={product.description}
                    onChange={(e) => setProduct({ ...product, description: e.target.value })}
                    placeholder="Description"
                    required
                />
                <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={product.price}
                    onChange={(e) => setProduct({ ...product, price: e.target.value })}
                    placeholder="Price"
                    required
                />
                <input
                    type="number"
                    min={0}
                    value={product.stock}
                    onChange={(e) => setProduct({ ...product, stock: e.target.value })}
                    placeholder="Stock"
                    required
                />
                <select
                    value={product.category_id}
                    onChange={(e) => setProduct({ ...product, category_id: e.target.value })}
                    required
                >
                    <option value="">Category</option>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
                <button className="btn">Add product</button>
            </form>

            <h2>Orders</h2>
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
                    {orders.map((order) => {
                        const action = nextAction[order.status];
                        return (
                            <tr key={order.id}>
                                <td>
                                    <Link to={`/orders/${order.id}`}>{order.id}</Link>
                                </td>
                                <td>
                                    <span className="badge">{order.status}</span>
                                </td>
                                <td>{money(order.total)}</td>
                                <td>
                                    {action && (
                                        <button
                                            className="btn secondary"
                                            onClick={async () => {
                                                try {
                                                    await action.run(order.id);
                                                    await load();
                                                } catch (err) {
                                                    setError(
                                                        err instanceof Error ? err.message : "Update failed"
                                                    );
                                                }
                                            }}
                                        >
                                            {action.label}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
}

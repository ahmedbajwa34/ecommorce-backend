export type User = {
    id: number;
    name: string;
    email: string;
    role: "customer" | "admin";
};

export type Product = {
    id: number;
    name: string;
    description: string;
    price: string | number;
    stock: number;
    category_id: number;
};

export type Category = {
    id: number;
    name: string;
};

export type CartItem = {
    id: number;
    quantity: number;
    cart_id: number;
    product_id: number;
    name: string;
    description: string;
    price: string | number;
    line_total: string | number;
};

export type Order = {
    id: number;
    user_id?: number;
    status: string;
    total: string | number;
    shipping_address: string;
    created_at: string;
};

export type OrderItem = {
    product_id: number;
    name: string;
    quantity: number;
    unit_price: string | number;
    line_total: string | number;
};

export type Payment = {
    id: number;
    order_id: number;
    amount: string | number;
    status: string;
    payment_method: string;
};

type ApiError = {
    message?: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const res = await fetch(path, {
        ...options,
        headers,
        credentials: "include",
    });

    const payload = (await res.json().catch(() => ({}))) as T & ApiError;
    if (!res.ok) {
        throw new Error(payload.message || "Something went wrong");
    }
    return payload;
}

export const api = {
    me: () => request<{ data: User }>("/api/me"),
    register: (body: { name: string; email: string; password: string }) =>
        request("/api/register", { method: "POST", body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
        request("/api/login", { method: "POST", body: JSON.stringify(body) }),
    logout: () => request("/api/logout", { method: "POST" }),
    products: () => request<{ data: Product[] }>("/api/products"),
    product: (id: number) => request<{ data: Product }>(`/api/products/${id}`),
    categories: () => request<{ data: Category[] }>("/api/categories"),
    createCategory: (name: string) =>
        request("/api/categories", { method: "POST", body: JSON.stringify({ name }) }),
    createProduct: (body: {
        name: string;
        description: string;
        price: number;
        stock: number;
        category_id: number;
    }) => request("/api/products", { method: "POST", body: JSON.stringify(body) }),
    cart: () => request<{ data: { cart: unknown; items: CartItem[] } }>("/api/cart"),
    addToCart: (product_id: number, quantity: number) =>
        request("/api/cart/items", {
            method: "POST",
            body: JSON.stringify({ product_id, quantity }),
        }),
    updateCartItem: (product_id: number, quantity: number) =>
        request(`/api/cart/items/${product_id}`, {
            method: "PATCH",
            body: JSON.stringify({ quantity }),
        }),
    removeCartItem: (product_id: number) =>
        request(`/api/cartItem/${product_id}`, { method: "DELETE" }),
    clearCart: () => request("/api/cart", { method: "DELETE" }),
    placeOrder: (body: { shipping_address: string; payment_method: "card" | "cash_on_delivery" }) =>
        request<{ data: Order }>("/api/placeOrder", {
            method: "POST",
            body: JSON.stringify(body),
        }),
    orders: () => request<{ data: Order[] }>("/api/orders"),
    order: (id: number) => request<{ data: { order: Order; items: OrderItem[] } }>(`/api/order/${id}`),
    payment: (id: number) => request<{ data: Payment }>(`/api/orders/${id}/payment`),
    startPay: (id: number) =>
        request<{ data: { clientSecret: string; alreadyPaid: boolean } }>(`/api/orders/${id}/pay`, {
            method: "POST",
        }),
    confirmPay: (id: number) =>
        request<{ data: Payment }>(`/api/orders/${id}/pay/confirm`, { method: "POST" }),
    config: () => request<{ data: { stripePublishableKey: string } }>("/api/payments/config"),
    confirmOrder: (id: number) => request(`/api/orders/${id}/confirm`, { method: "PATCH" }),
    processOrder: (id: number) => request(`/api/orders/${id}/process`, { method: "PATCH" }),
    shipOrder: (id: number) => request(`/api/orders/${id}/ship`, { method: "PATCH" }),
    deliverOrder: (id: number) => request(`/api/orders/${id}/deliver`, { method: "PATCH" }),
};

export const money = (value: string | number) => {
    const amount = Number(value);
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
        Number.isFinite(amount) ? amount : 0
    );
};

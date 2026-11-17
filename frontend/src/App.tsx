import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Layout } from "./Layout";
import { Home } from "./pages/Home";
import { ProductDetail } from "./pages/ProductDetail";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { OrderDetailPage, OrdersPage } from "./pages/OrdersPages";
import { PayPage } from "./pages/PayPage";
import { AdminPage } from "./pages/AdminPage";

function Guard({
    children,
    role,
}: {
    children: ReactNode;
    role?: "customer" | "admin";
}) {
    const { user, loading } = useAuth();
    if (loading) {
        return <div className="empty">Loading…</div>;
    }
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    if (role && user.role !== role) {
        return <Navigate to="/" replace />;
    }
    return children;
}

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                    path="/cart"
                    element={
                        <Guard>
                            <CartPage />
                        </Guard>
                    }
                />
                <Route
                    path="/checkout"
                    element={
                        <Guard role="customer">
                            <CheckoutPage />
                        </Guard>
                    }
                />
                <Route
                    path="/orders"
                    element={
                        <Guard>
                            <OrdersPage />
                        </Guard>
                    }
                />
                <Route
                    path="/orders/:id"
                    element={
                        <Guard>
                            <OrderDetailPage />
                        </Guard>
                    }
                />
                <Route
                    path="/orders/:id/pay"
                    element={
                        <Guard role="customer">
                            <PayPage />
                        </Guard>
                    }
                />
                <Route
                    path="/admin"
                    element={
                        <Guard role="admin">
                            <AdminPage />
                        </Guard>
                    }
                />
            </Route>
        </Routes>
    );
}

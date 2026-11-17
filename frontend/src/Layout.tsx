import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function Layout() {
    const { user, logout } = useAuth();

    return (
        <div className="shell">
            <header className="topbar">
                <NavLink to="/" className="logo">
                    Lumen
                </NavLink>
                <nav>
                    <NavLink to="/">Shop</NavLink>
                    {user ? (
                        <>
                            <NavLink to="/cart">Cart</NavLink>
                            <NavLink to="/orders">Orders</NavLink>
                            {user.role === "admin" && <NavLink to="/admin">Studio</NavLink>}
                            <span className="muted">{user.name}</span>
                            <button className="btn secondary" onClick={() => void logout()}>
                                Sign out
                            </button>
                        </>
                    ) : (
                        <>
                            <NavLink to="/login">Sign in</NavLink>
                            <NavLink to="/register">Create account</NavLink>
                        </>
                    )}
                </nav>
            </header>
            <Outlet />
        </div>
    );
}

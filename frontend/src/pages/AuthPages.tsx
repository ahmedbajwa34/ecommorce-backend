import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export function LoginPage() {
    const { user, refresh } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    if (user) {
        return <Navigate to="/" replace />;
    }

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        try {
            await api.login({ email, password });
            await refresh();
            navigate("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        }
    };

    return (
        <section className="panel">
            <h1>Welcome back</h1>
            <form className="form" onSubmit={onSubmit}>
                <label>
                    Email
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label>
                    Password
                    <input
                        type="password"
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </label>
                {error && <p className="flash">{error}</p>}
                <button className="btn">Sign in</button>
            </form>
            <p className="muted">
                New here? <Link to="/register">Create an account</Link>
            </p>
        </section>
    );
}

export function RegisterPage() {
    const { user, refresh } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    if (user) {
        return <Navigate to="/" replace />;
    }

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        try {
            await api.register({ name, email, password });
            await api.login({ email, password });
            await refresh();
            navigate("/");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create account");
        }
    };

    return (
        <section className="panel">
            <h1>Create an account</h1>
            <form className="form" onSubmit={onSubmit}>
                <label>
                    Name
                    <input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
                </label>
                <label>
                    Email
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label>
                    Password
                    <input
                        type="password"
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </label>
                {error && <p className="flash">{error}</p>}
                <button className="btn">Create account</button>
            </form>
        </section>
    );
}

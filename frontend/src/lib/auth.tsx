"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthUser {
    id: string;
    email: string;
    full_name: string;
    role: "PATIENT" | "DOCTOR" | "DEVELOPER";
}

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, fullName: string, role: string) => Promise<void>;
    logout: () => void;
    isAdmin: boolean;
    isDoctor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Restore session from localStorage on mount
    useEffect(() => {
        const savedToken = localStorage.getItem("medai_token");
        const savedUser = localStorage.getItem("medai_user");
        if (savedToken && savedUser) {
            try {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem("medai_token");
                localStorage.removeItem("medai_user");
            }
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const res = await fetch(`${API}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.detail || `Login failed (${res.status})`);
        }

        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("medai_token", data.token);
        localStorage.setItem("medai_user", JSON.stringify(data.user));
    };

    const register = async (email: string, password: string, fullName: string, role: string) => {
        const res = await fetch(`${API}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, full_name: fullName, role }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => null);
            throw new Error(err?.detail || `Registration failed (${res.status})`);
        }

        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("medai_token", data.token);
        localStorage.setItem("medai_user", JSON.stringify(data.user));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("medai_token");
        localStorage.removeItem("medai_user");
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                loading,
                login,
                register,
                logout,
                isAdmin: user?.role === "DEVELOPER",
                isDoctor: user?.role === "DOCTOR",
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}

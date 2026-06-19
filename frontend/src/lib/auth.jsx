import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("verdant_user");
    return u ? JSON.parse(u) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("verdant_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then((r) => {
        setUser(r.data);
        localStorage.setItem("verdant_user", JSON.stringify(r.data));
      })
      .catch(() => {
        localStorage.removeItem("verdant_token");
        localStorage.removeItem("verdant_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("verdant_token", r.data.token);
    localStorage.setItem("verdant_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };

  const register = async (payload) => {
    const r = await api.post("/auth/register", payload);
    localStorage.setItem("verdant_token", r.data.token);
    localStorage.setItem("verdant_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem("verdant_token");
    localStorage.removeItem("verdant_user");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

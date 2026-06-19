import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

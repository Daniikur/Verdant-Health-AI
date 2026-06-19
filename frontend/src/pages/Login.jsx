import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Leaf } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}`);
      if (u.role === "doctor") nav("/doctor");
      else if (u.role === "admin") nav("/admin");
      else nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (kind) => {
    if (kind === "patient") { setEmail("patient@verdant.health"); setPassword("patient123"); }
    if (kind === "doctor") { setEmail("amara@verdant.health"); setPassword("doctor123"); }
    if (kind === "admin") { setEmail("admin@verdant.health"); setPassword("admin123"); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md fade-in">
          <Link to="/" className="inline-flex items-center gap-2 mb-10" data-testid="login-back-home">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="font-display text-2xl font-medium">Verdant</span>
          </Link>
          <div className="overline mb-3">Welcome back</div>
          <h1 className="font-display text-4xl font-light tracking-tight mb-8">Sign in to your space.</h1>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                className="mt-1.5 rounded-xl h-11"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
                className="mt-1.5 rounded-xl h-11"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="login-submit-btn">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-8 p-4 rounded-2xl border border-dashed border-border bg-secondary/30">
            <div className="overline mb-2">Try a demo account</div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => fillDemo("patient")} data-testid="demo-patient-btn">Patient</Button>
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => fillDemo("doctor")} data-testid="demo-doctor-btn">Doctor</Button>
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => fillDemo("admin")} data-testid="demo-admin-btn">Admin</Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-8 text-center">
            New here?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline" data-testid="login-to-register-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1743657166982-9e3ff272122b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMG9yZ2FuaWMlMjBzaGFwZSUyMHdhcm0lMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc4MTcwMzMwMHww&ixlib=rb-4.1.0&q=85"
          alt="warm"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

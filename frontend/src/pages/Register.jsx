import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Leaf } from "lucide-react";
import { toast } from "sonner";
import { SPECIALTIES } from "../lib/api";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "patient",
    specialty: "General Practice", experience_years: 1, bio: "", consultation_fee: 50,
  });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await register(form);
      toast.success(`Welcome, ${u.name}`);
      if (u.role === "doctor") nav("/doctor");
      else nav("/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1743657166982-9e3ff272122b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMG9yZ2FuaWMlMjBzaGFwZSUyMHdhcm0lMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc4MTcwMzMwMHww&ixlib=rb-4.1.0&q=85"
          alt="warm"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md fade-in">
          <Link to="/" className="inline-flex items-center gap-2 mb-10" data-testid="register-back-home">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="font-display text-2xl font-medium">Verdant</span>
          </Link>

          <div className="overline mb-3">Join us</div>
          <h1 className="font-display text-4xl font-light tracking-tight mb-8">Create your account.</h1>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>I am a</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger className="mt-1.5 rounded-xl h-11" data-testid="register-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required data-testid="register-name-input" className="mt-1.5 rounded-xl h-11" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required data-testid="register-email-input" className="mt-1.5 rounded-xl h-11" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={6} data-testid="register-password-input" className="mt-1.5 rounded-xl h-11" />
            </div>

            {form.role === "doctor" && (
              <>
                <div>
                  <Label>Specialty</Label>
                  <Select value={form.specialty} onValueChange={(v) => set("specialty", v)}>
                    <SelectTrigger className="mt-1.5 rounded-xl h-11" data-testid="register-specialty-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Years experience</Label>
                    <Input type="number" value={form.experience_years} onChange={(e) => set("experience_years", parseInt(e.target.value) || 0)} className="mt-1.5 rounded-xl h-11" data-testid="register-experience-input" />
                  </div>
                  <div>
                    <Label>Fee (USD)</Label>
                    <Input type="number" value={form.consultation_fee} onChange={(e) => set("consultation_fee", parseFloat(e.target.value) || 0)} className="mt-1.5 rounded-xl h-11" data-testid="register-fee-input" />
                  </div>
                </div>
                <div>
                  <Label>Short bio</Label>
                  <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} className="mt-1.5 rounded-xl" data-testid="register-bio-input" />
                </div>
              </>
            )}

            <Button type="submit" disabled={loading} className="w-full rounded-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground mt-2" data-testid="register-submit-btn">
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-6 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline" data-testid="register-to-login-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

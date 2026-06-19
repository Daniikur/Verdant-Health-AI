import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "./ui/button";
import { Leaf, LogOut, Bell, LayoutDashboard, MessageCircle, Calendar, FileText, Stethoscope, ShieldCheck } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "./ui/dropdown-menu";
import NotificationBell from "./NotificationBell";

export default function Header() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const handleLogout = () => {
    logout();
    nav("/");
  };

  const navItems = user?.role === "patient"
    ? [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/doctors", label: "Find Doctor", icon: Stethoscope },
        { to: "/appointments", label: "Appointments", icon: Calendar },
        { to: "/records", label: "Records", icon: FileText },
        { to: "/ai/symptom", label: "Symptom Checker", icon: MessageCircle },
      ]
    : user?.role === "doctor"
    ? [
        { to: "/doctor", label: "Dashboard", icon: LayoutDashboard },
        { to: "/doctor/appointments", label: "Appointments", icon: Calendar },
      ]
    : user?.role === "admin"
    ? [
        { to: "/admin", label: "Dashboard", icon: ShieldCheck },
      ]
    : [];

  return (
    <header
      className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur"
      data-testid="app-header"
    >
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="font-display text-2xl font-medium tracking-tight">
            Verdant
          </span>
          <span className="overline ml-1 hidden sm:inline">Health</span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => {
              const Icon = n.icon;
              const active = loc.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  data-testid={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`px-3 py-2 rounded-full text-sm flex items-center gap-2 transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    data-testid="user-menu-trigger"
                    className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-secondary transition"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback>{user.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm">{user.name}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-sm">{user.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="logout-btn">
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" className="rounded-full" data-testid="header-login-btn">Sign in</Button>
              </Link>
              <Link to="/register">
                <Button className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="header-signup-btn">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

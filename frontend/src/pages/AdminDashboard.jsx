import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Users, Stethoscope, Calendar, Sparkles, Trash2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [tab, setTab] = useState("users");

  const load = async () => {
    const [s, u, a] = await Promise.all([api.get("/admin/stats"), api.get("/admin/users"), api.get("/admin/activity")]);
    setStats(s.data);
    setUsers(u.data);
    setActivity(a.data);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    await api.delete(`/admin/users/${id}`);
    toast.success("Deleted");
    load();
  };

  if (!stats) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <div className="overline mb-2">Admin Console</div>
          <h1 className="font-display text-4xl sm:text-5xl font-light tracking-tight">Platform pulse</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat icon={Users} label="Patients" value={stats.total_patients} testid="admin-stat-patients" />
          <Stat icon={Stethoscope} label="Doctors" value={stats.total_doctors} testid="admin-stat-doctors" />
          <Stat icon={Calendar} label="Appointments" value={stats.total_appointments} testid="admin-stat-appts" />
          <Stat icon={Sparkles} label="Prescriptions" value={stats.total_prescriptions} testid="admin-stat-rx" />
        </div>

        <Card className="p-6 rounded-2xl mb-6">
          <h2 className="font-display text-2xl font-medium mb-4">Activity · last 7 days</h2>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" />
                <XAxis dataKey="date" fontSize={11} stroke="#6B6B6B" />
                <YAxis fontSize={11} stroke="#6B6B6B" />
                <Tooltip />
                <Bar dataKey="appointments" fill="#3A4D2B" radius={[8, 8, 0, 0]} />
                <Bar dataKey="registrations" fill="#E27D60" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Button variant={tab === "users" ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setTab("users")} data-testid="tab-users">Users</Button>
          </div>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="p-4 rounded-xl border border-border flex items-center justify-between" data-testid={`admin-user-${u.id}`}>
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-sm text-muted-foreground">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full capitalize">{u.role}</Badge>
                  {u.role !== "admin" && (
                    <Button size="sm" variant="ghost" onClick={() => remove(u.id)} data-testid={`admin-delete-${u.id}`}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, testid }) {
  return (
    <Card className="p-5 rounded-2xl" data-testid={testid}>
      <Icon className="h-4 w-4 text-muted-foreground mb-3" />
      <div className="overline">{label}</div>
      <div className="font-display text-4xl font-light mt-1">{value}</div>
    </Card>
  );
}

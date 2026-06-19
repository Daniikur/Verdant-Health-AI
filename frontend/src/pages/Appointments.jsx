import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Video, Calendar, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";

export default function Appointments() {
  const { user } = useAuth();
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await api.get("/appointments");
    setAppts(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!window.confirm("Cancel this appointment?")) return;
    await api.delete(`/appointments/${id}`);
    toast.success("Cancelled");
    load();
  };

  const complete = async (id) => {
    await api.patch(`/appointments/${id}`, { status: "completed" });
    toast.success("Marked completed");
    load();
  };

  const grouped = {
    scheduled: appts.filter((a) => a.status === "scheduled"),
    completed: appts.filter((a) => a.status === "completed"),
    cancelled: appts.filter((a) => a.status === "cancelled"),
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="overline mb-2">All appointments</div>
            <h1 className="font-display text-4xl font-light tracking-tight">Your schedule</h1>
          </div>
          {user?.role === "patient" && (
            <Link to="/doctors">
              <Button className="rounded-full bg-primary hover:bg-primary/90" data-testid="new-appointment-btn">
                <Calendar className="h-4 w-4 mr-2" /> New appointment
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading…</div>
        ) : appts.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl">No appointments yet.</Card>
        ) : (
          <div className="space-y-8">
            {["scheduled", "completed", "cancelled"].map((status) => (
              grouped[status].length > 0 && (
                <section key={status}>
                  <h2 className="overline mb-3">{status}</h2>
                  <div className="space-y-3">
                    {grouped[status].map((a) => (
                      <Card key={a.id} className="p-5 rounded-2xl flex items-center justify-between" data-testid={`appointment-row-${a.id}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <div className="font-medium">{user?.role === "patient" ? a.doctor_name : a.patient_name}</div>
                            <Badge variant="outline" className="rounded-full text-xs">{a.specialty}</Badge>
                            <Badge className={`rounded-full text-xs ${
                              status === "scheduled" ? "bg-primary text-primary-foreground" :
                              status === "completed" ? "bg-accent text-accent-foreground" :
                              "bg-destructive text-destructive-foreground"
                            }`}>{status}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">{new Date(a.appointment_date).toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground mt-1">Reason: {a.reason}</div>
                        </div>
                        {status === "scheduled" && (
                          <div className="flex gap-2">
                            {a.mode === "video" && (
                              <Link to={`/consult/${a.id}`}>
                                <Button size="sm" className="rounded-full bg-terra hover:bg-terra/90 text-terra-foreground" data-testid={`join-btn-${a.id}`}>
                                  <Video className="h-3 w-3 mr-1" /> Join
                                </Button>
                              </Link>
                            )}
                            {user?.role === "doctor" && (
                              <Button size="sm" variant="outline" className="rounded-full" onClick={() => complete(a.id)} data-testid={`complete-btn-${a.id}`}>
                                Complete
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="rounded-full" onClick={() => cancel(a.id)} data-testid={`cancel-btn-${a.id}`}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </section>
              )
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

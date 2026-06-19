import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Calendar, Users, FileText, Sparkles, Video } from "lucide-react";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [appts, setAppts] = useState([]);
  const [rxs, setRxs] = useState([]);

  useEffect(() => {
    api.get("/appointments").then((r) => setAppts(r.data));
    api.get("/prescriptions").then((r) => setRxs(r.data));
  }, []);

  const today = new Date().toDateString();
  const todays = appts.filter((a) => new Date(a.appointment_date).toDateString() === today);
  const upcoming = appts.filter((a) => a.status === "scheduled" && new Date(a.appointment_date) > new Date());
  const uniquePatients = new Set(appts.map((a) => a.patient_id)).size;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <div className="overline mb-2">Doctor Dashboard</div>
          <h1 className="font-display text-4xl sm:text-5xl font-light tracking-tight">
            Welcome, <em className="text-primary font-medium">{user?.name}</em>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-5 rounded-2xl" data-testid="doc-stat-today">
            <Calendar className="h-4 w-4 text-muted-foreground mb-3" />
            <div className="overline">Today</div>
            <div className="font-display text-4xl font-light mt-1">{todays.length}</div>
          </Card>
          <Card className="p-5 rounded-2xl" data-testid="doc-stat-upcoming">
            <Calendar className="h-4 w-4 text-muted-foreground mb-3" />
            <div className="overline">Upcoming</div>
            <div className="font-display text-4xl font-light mt-1">{upcoming.length}</div>
          </Card>
          <Card className="p-5 rounded-2xl" data-testid="doc-stat-patients">
            <Users className="h-4 w-4 text-muted-foreground mb-3" />
            <div className="overline">Patients</div>
            <div className="font-display text-4xl font-light mt-1">{uniquePatients}</div>
          </Card>
          <Card className="p-5 rounded-2xl" data-testid="doc-stat-rx">
            <Sparkles className="h-4 w-4 text-muted-foreground mb-3" />
            <div className="overline">Prescriptions</div>
            <div className="font-display text-4xl font-light mt-1">{rxs.length}</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 rounded-2xl">
            <h2 className="font-display text-2xl font-medium mb-4">Today&apos;s schedule</h2>
            {todays.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">Nothing today. A quiet day.</div>
            ) : (
              <div className="space-y-3">
                {todays.map((a) => (
                  <div key={a.id} className="p-4 rounded-xl border border-border flex items-center justify-between" data-testid={`doc-today-${a.id}`}>
                    <div>
                      <div className="font-medium">{a.patient_name}</div>
                      <div className="text-sm text-muted-foreground">{new Date(a.appointment_date).toLocaleTimeString()}</div>
                      <div className="text-xs text-muted-foreground mt-1">{a.reason}</div>
                    </div>
                    {a.video_link && (
                      <Link to={`/consult/${a.id}`}>
                        <Button size="sm" className="rounded-full bg-terra hover:bg-terra/90 text-terra-foreground" data-testid={`doc-join-${a.id}`}>
                          <Video className="h-3 w-3 mr-1" /> Join
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6 rounded-2xl">
            <h2 className="font-display text-2xl font-medium mb-4">Recent prescriptions</h2>
            {rxs.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">No prescriptions yet.</div>
            ) : (
              <div className="space-y-3">
                {rxs.slice(0, 5).map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border border-border" data-testid={`doc-rx-${r.id}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium">{r.patient_name}</div>
                      <Badge variant="outline" className="rounded-full text-xs">{new Date(r.created_at).toLocaleDateString()}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{r.diagnosis}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-6 rounded-2xl mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-medium">My patients</h2>
          </div>
          <PatientList appts={appts} />
        </Card>
      </main>
    </div>
  );
}

function PatientList({ appts }) {
  const uniques = Array.from(new Map(appts.map((a) => [a.patient_id, a])).values());
  if (uniques.length === 0) return <div className="text-center text-muted-foreground py-6">No patients yet.</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {uniques.map((a) => (
        <Link key={a.patient_id} to={`/doctor/patient/${a.patient_id}`}>
          <div className="p-4 rounded-xl border border-border hover:bg-secondary/40 transition" data-testid={`patient-row-${a.patient_id}`}>
            <div className="font-medium">{a.patient_name}</div>
            <div className="text-sm text-muted-foreground">Last visit: {new Date(a.appointment_date).toLocaleDateString()}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

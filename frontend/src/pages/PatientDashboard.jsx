import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import Header from "../components/Header";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Calendar, Video, FileText, Brain, Sparkles, Stethoscope, ArrowRight } from "lucide-react";
import { Badge } from "../components/ui/badge";

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appts, setAppts] = useState([]);
  const [records, setRecords] = useState([]);
  const [rxs, setRxs] = useState([]);

  useEffect(() => {
    api.get("/appointments").then((r) => setAppts(r.data));
    api.get("/medical-records").then((r) => setRecords(r.data));
    api.get("/prescriptions").then((r) => setRxs(r.data));
  }, []);

  const upcoming = appts.filter((a) => a.status === "scheduled" && new Date(a.appointment_date) > new Date());

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 fade-in">
          <div className="overline mb-2">Patient Dashboard</div>
          <h1 className="font-display text-4xl sm:text-5xl font-light tracking-tight">
            Good to see you, <em className="text-primary font-medium">{user?.name?.split(" ")[0]}</em>.
          </h1>
          <p className="text-muted-foreground mt-2">Here's a quiet view of what matters today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Calendar} label="Upcoming" value={upcoming.length} testid="stat-upcoming" />
          <StatCard icon={FileText} label="Records" value={records.length} testid="stat-records" />
          <StatCard icon={Sparkles} label="Prescriptions" value={rxs.length} testid="stat-rx" />
          <StatCard icon={Brain} label="AI Sessions" value="∞" testid="stat-ai" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming */}
          <Card className="lg:col-span-2 p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-medium">Upcoming appointments</h2>
              <Link to="/appointments"><Button variant="ghost" size="sm" className="rounded-full" data-testid="view-all-appts">View all <ArrowRight className="ml-1 h-3 w-3" /></Button></Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <div className="mb-4">No appointments yet.</div>
                <Link to="/doctors">
                  <Button className="rounded-full bg-primary hover:bg-primary/90" data-testid="empty-book-btn">Book your first</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-4 rounded-xl border border-border" data-testid={`appt-${a.id}`}>
                    <div>
                      <div className="font-medium">{a.doctor_name}</div>
                      <div className="text-sm text-muted-foreground">{a.specialty} · {new Date(a.appointment_date).toLocaleString()}</div>
                    </div>
                    {a.mode === "video" && a.video_link && (
                      <Link to={`/consult/${a.id}`}>
                        <Button size="sm" className="rounded-full bg-terra hover:bg-terra/90 text-terra-foreground" data-testid={`join-${a.id}`}>
                          <Video className="h-3 w-3 mr-1" /> Join
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* AI Card */}
          <Card className="p-6 rounded-2xl bg-primary text-primary-foreground border-primary">
            <Brain className="h-6 w-6 mb-4" />
            <div className="overline text-primary-foreground/70 mb-2">Verdant AI</div>
            <h3 className="font-display text-2xl font-medium mb-3">Not feeling great?</h3>
            <p className="text-primary-foreground/80 text-sm mb-5">
              Describe your symptoms — our Gemini-powered triage will suggest the right specialty.
            </p>
            <Link to="/ai/symptom">
              <Button className="rounded-full bg-terra hover:bg-terra/90 text-terra-foreground" data-testid="ai-symptom-cta">
                Start symptom check
              </Button>
            </Link>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <QuickAction to="/doctors" icon={Stethoscope} title="Find a doctor" desc="Browse by specialty" testid="qa-find-doctor" />
          <QuickAction to="/ai/chat" icon={Sparkles} title="Ask the AI" desc="Health Q&A 24/7" testid="qa-ai-chat" />
          <QuickAction to="/records" icon={FileText} title="My records" desc="View & summarize" testid="qa-records" />
        </div>

        {/* Recent prescriptions */}
        {rxs.length > 0 && (
          <Card className="p-6 rounded-2xl mt-6">
            <h2 className="font-display text-2xl font-medium mb-4">Recent prescriptions</h2>
            <div className="space-y-3">
              {rxs.slice(0, 3).map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-border" data-testid={`rx-${r.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{r.diagnosis}</div>
                    <Badge variant="outline" className="rounded-full">{r.doctor_name}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {r.medications.map((m) => `${m.name} ${m.dosage}`).join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, testid }) {
  return (
    <Card className="p-5 rounded-2xl" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div className="overline">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="font-display text-4xl font-light mt-2">{value}</div>
    </Card>
  );
}

function QuickAction({ to, icon: Icon, title, desc, testid }) {
  return (
    <Link to={to} data-testid={testid}>
      <Card className="p-5 rounded-2xl hover:bg-secondary/40 transition cursor-pointer h-full">
        <Icon className="h-5 w-5 text-primary mb-3" />
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </Card>
    </Link>
  );
}

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, User, Calendar as CalIcon, FileText } from "lucide-react";

export default function ConsultRoom() {
  const { id } = useParams();
  const [appt, setAppt] = useState(null);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    api.get(`/appointments/${id}`).then((r) => setAppt(r.data));
  }, [id]);

  useEffect(() => {
    if (appt) {
      api.get(`/medical-records?patient_id=${appt.patient_id}`).then((r) => setRecords(r.data));
    }
  }, [appt]);

  if (!appt) return <div className="p-12 text-center text-muted-foreground">Loading consultation…</div>;

  const roomName = appt.video_link?.split("/").pop() || `verdant-${id.slice(0, 12)}`;
  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(appt.patient_name)}"&config.prejoinPageEnabled=false`;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-6">
        <Link to="/appointments" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4" data-testid="back-link">
          <ArrowLeft className="h-3 w-3 mr-1" /> Back to appointments
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 fade-in">
            <Card className="rounded-2xl overflow-hidden border-border shadow-lg" data-testid="consult-room">
              <div className="aspect-video bg-black">
                <iframe
                  title="Verdant Consultation"
                  src={jitsiUrl}
                  allow="camera; microphone; fullscreen; display-capture; autoplay"
                  className="w-full h-full border-0"
                />
              </div>
            </Card>
          </div>

          <aside className="lg:col-span-4 space-y-4">
            <Card className="p-5 rounded-2xl">
              <div className="overline mb-3">Consultation</div>
              <div className="flex items-center gap-2 mb-2 text-sm">
                <CalIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {new Date(appt.appointment_date).toLocaleString()}
              </div>
              <div className="flex items-center gap-2 mb-2 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {appt.patient_name} ↔ {appt.doctor_name}
              </div>
              <Badge variant="outline" className="rounded-full mt-2">{appt.specialty}</Badge>
              <div className="text-sm text-muted-foreground mt-4">{appt.reason}</div>
            </Card>

            <Card className="p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="overline">Patient records</div>
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {records.length === 0 ? (
                <div className="text-sm text-muted-foreground">No records on file.</div>
              ) : (
                <div className="space-y-2">
                  {records.slice(0, 5).map((r) => (
                    <div key={r.id} className="p-3 rounded-xl border border-border text-sm">
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground">{r.diagnosis}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5 rounded-2xl bg-secondary/40">
              <div className="overline mb-2">Tips</div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Stable lighting helps your doctor see clearly</li>
                <li>Use headphones to reduce echo</li>
                <li>Have your medication list ready</li>
              </ul>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Header from "../components/Header";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, Plus, Trash, FileText } from "lucide-react";
import { toast } from "sonner";

export default function PatientView() {
  const { patientId } = useParams();
  const [records, setRecords] = useState([]);
  const [rxs, setRxs] = useState([]);
  const [appts, setAppts] = useState([]);
  const [open, setOpen] = useState(false);
  const [rxForm, setRxForm] = useState({
    diagnosis: "", instructions: "", medications: [{ name: "", dosage: "", frequency: "", duration: "" }],
  });

  const load = async () => {
    const [r1, r2, r3] = await Promise.all([
      api.get(`/medical-records?patient_id=${patientId}`),
      api.get(`/prescriptions?patient_id=${patientId}`),
      api.get(`/appointments`),
    ]);
    setRecords(r1.data);
    setRxs(r2.data);
    setAppts(r3.data.filter((a) => a.patient_id === patientId));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [patientId]);

  const patientName = appts[0]?.patient_name || records[0]?.patient_name || rxs[0]?.patient_name || "Patient";

  const updateMed = (i, k, v) => {
    setRxForm((f) => {
      const meds = [...f.medications];
      meds[i] = { ...meds[i], [k]: v };
      return { ...f, medications: meds };
    });
  };
  const addMed = () => setRxForm((f) => ({ ...f, medications: [...f.medications, { name: "", dosage: "", frequency: "", duration: "" }] }));
  const rmMed = (i) => setRxForm((f) => ({ ...f, medications: f.medications.filter((_, idx) => idx !== i) }));

  const issueRx = async () => {
    if (!rxForm.diagnosis) {
      toast.error("Diagnosis required");
      return;
    }
    try {
      await api.post("/prescriptions", { patient_id: patientId, ...rxForm });
      toast.success("Prescription issued");
      setOpen(false);
      setRxForm({ diagnosis: "", instructions: "", medications: [{ name: "", dosage: "", frequency: "", duration: "" }] });
      load();
    } catch (e) {
      toast.error("Failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/doctor" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-3 w-3 mr-1" /> Back
        </Link>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="overline mb-1">Patient profile</div>
            <h1 className="font-display text-4xl font-light tracking-tight">{patientName}</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary hover:bg-primary/90" data-testid="issue-rx-btn">
                <Plus className="h-4 w-4 mr-1" /> Write prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-xl">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-medium">New prescription</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="overline mb-2 block">Diagnosis</label>
                  <Input value={rxForm.diagnosis} onChange={(e) => setRxForm({ ...rxForm, diagnosis: e.target.value })} className="rounded-xl h-11" data-testid="rx-diagnosis" />
                </div>
                <div>
                  <label className="overline mb-2 block">Medications</label>
                  <div className="space-y-2">
                    {rxForm.medications.map((m, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2">
                        <Input placeholder="Name" value={m.name} onChange={(e) => updateMed(i, "name", e.target.value)} className="col-span-4 rounded-xl h-10" data-testid={`med-name-${i}`} />
                        <Input placeholder="Dosage" value={m.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} className="col-span-2 rounded-xl h-10" />
                        <Input placeholder="Frequency" value={m.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} className="col-span-3 rounded-xl h-10" />
                        <Input placeholder="Duration" value={m.duration} onChange={(e) => updateMed(i, "duration", e.target.value)} className="col-span-2 rounded-xl h-10" />
                        <Button type="button" variant="ghost" size="sm" onClick={() => rmMed(i)} className="col-span-1"><Trash className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="rounded-full mt-2" onClick={addMed} data-testid="add-med-btn"><Plus className="h-3 w-3 mr-1" />Add medication</Button>
                </div>
                <div>
                  <label className="overline mb-2 block">Instructions</label>
                  <Textarea value={rxForm.instructions} onChange={(e) => setRxForm({ ...rxForm, instructions: e.target.value })} className="rounded-xl" data-testid="rx-instructions" />
                </div>
                <Button onClick={issueRx} className="w-full rounded-full bg-primary hover:bg-primary/90 h-11" data-testid="rx-submit-btn">Issue prescription</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 rounded-2xl">
            <h2 className="font-display text-2xl font-medium mb-4">History</h2>
            {appts.length === 0 ? <div className="text-muted-foreground text-sm">No history.</div> :
              <div className="space-y-3">
                {appts.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl border border-border text-sm">
                    <div className="font-medium">{new Date(a.appointment_date).toLocaleString()}</div>
                    <div className="text-muted-foreground">{a.reason}</div>
                    <Badge variant="outline" className="rounded-full text-xs mt-1">{a.status}</Badge>
                  </div>
                ))}
              </div>
            }
          </Card>

          <Card className="p-6 rounded-2xl">
            <h2 className="font-display text-2xl font-medium mb-4">Records</h2>
            {records.length === 0 ? <div className="text-muted-foreground text-sm">No records.</div> :
              <div className="space-y-3">
                {records.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl border border-border text-sm">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-muted-foreground">{r.diagnosis}</div>
                    {r.file_name && <Badge variant="outline" className="rounded-full text-xs mt-1"><FileText className="h-3 w-3 mr-1" />{r.file_name}</Badge>}
                  </div>
                ))}
              </div>
            }
          </Card>
        </div>

        <Card className="p-6 rounded-2xl mt-6">
          <h2 className="font-display text-2xl font-medium mb-4">Prescriptions</h2>
          {rxs.length === 0 ? <div className="text-muted-foreground text-sm">No prescriptions yet.</div> :
            <div className="space-y-3">
              {rxs.map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{r.diagnosis}</div>
                    <Badge variant="outline" className="rounded-full text-xs">{new Date(r.created_at).toLocaleDateString()}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {r.medications.map((m, i) => (
                      <div key={i}>• {m.name} {m.dosage} — {m.frequency} × {m.duration}</div>
                    ))}
                  </div>
                  {r.instructions && <div className="text-xs text-muted-foreground mt-2 italic">{r.instructions}</div>}
                </div>
              ))}
            </div>
          }
        </Card>
      </main>
    </div>
  );
}

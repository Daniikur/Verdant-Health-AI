import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Plus, Sparkles, FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import ReactMarkdown from "../components/Markdown";

export default function MedicalRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", diagnosis: "", notes: "", file_name: "", file_data_base64: "" });
  const [summarizing, setSummarizing] = useState(null);

  const load = async () => {
    setLoading(true);
    const r = await api.get("/medical-records");
    setRecords(r.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = btoa(reader.result);
      setForm((s) => ({ ...s, file_name: f.name, file_data_base64: b64 }));
    };
    reader.readAsBinaryString(f);
  };

  const create = async () => {
    if (!form.title || !form.diagnosis) {
      toast.error("Title and diagnosis required");
      return;
    }
    try {
      await api.post("/medical-records", { patient_id: user.id, ...form });
      toast.success("Record added");
      setOpen(false);
      setForm({ title: "", diagnosis: "", notes: "", file_name: "", file_data_base64: "" });
      load();
    } catch (e) {
      toast.error("Could not add record");
    }
  };

  const summarize = async (rec) => {
    setSummarizing(rec.id);
    try {
      const r = await api.post("/ai/summarize-report", { record_id: rec.id });
      setRecords((rs) => rs.map((x) => x.id === rec.id ? { ...x, ai_summary: r.data.summary } : x));
      toast.success("Summary generated");
    } catch (e) {
      toast.error("Summarization failed");
    } finally {
      setSummarizing(null);
    }
  };

  const remove = async (rec) => {
    if (!window.confirm("Delete this record?")) return;
    await api.delete(`/medical-records/${rec.id}`);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="overline mb-2">Medical Records</div>
            <h1 className="font-display text-4xl font-light tracking-tight">Your health, archived calmly.</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary hover:bg-primary/90" data-testid="add-record-btn">
                <Plus className="h-4 w-4 mr-1" /> Add record
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-medium">New medical record</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Title (e.g. Blood Test - Jan 2026)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="record-title-input" className="rounded-xl h-11" />
                <Input placeholder="Diagnosis / summary" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} data-testid="record-diagnosis-input" className="rounded-xl h-11" />
                <Textarea placeholder="Notes (paste lab values, doctor notes, etc — useful for AI summary)" rows={6} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="record-notes-input" className="rounded-xl" />
                <div>
                  <label className="overline mb-2 block">Attach file (optional)</label>
                  <Input type="file" onChange={onFile} data-testid="record-file-input" className="rounded-xl" />
                  {form.file_name && <div className="text-xs text-muted-foreground mt-1">{form.file_name}</div>}
                </div>
                <Button onClick={create} className="w-full rounded-full bg-primary hover:bg-primary/90 h-11" data-testid="record-create-btn">Add record</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-10">Loading…</div>
        ) : records.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl">No records yet. Add your first.</Card>
        ) : (
          <div className="space-y-4">
            {records.map((r) => (
              <Card key={r.id} className="p-6 rounded-2xl" data-testid={`record-${r.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-display text-2xl font-medium">{r.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">{r.diagnosis}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full">{new Date(r.created_at).toLocaleDateString()}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => remove(r)} data-testid={`delete-record-${r.id}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {r.notes && <div className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{r.notes}</div>}
                {r.file_name && <Badge variant="outline" className="rounded-full mb-3"><FileText className="h-3 w-3 mr-1" /> {r.file_name}</Badge>}

                {r.ai_summary ? (
                  <div className="mt-4 p-4 rounded-xl bg-terra/10 border border-terra/30" data-testid={`ai-summary-${r.id}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-terra" />
                      <span className="overline text-terra">AI Summary · Claude Sonnet</span>
                    </div>
                    <ReactMarkdown content={r.ai_summary} />
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => summarize(r)}
                    disabled={summarizing === r.id}
                    data-testid={`summarize-btn-${r.id}`}
                  >
                    {summarizing === r.id ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Summarizing…</> : <><Sparkles className="h-3 w-3 mr-2" />Summarize with AI</>}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

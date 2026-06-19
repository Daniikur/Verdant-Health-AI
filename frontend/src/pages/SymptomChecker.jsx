import React, { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Brain, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const riskColors = {
  low: "bg-accent text-accent-foreground",
  moderate: "bg-amber-100 text-amber-900",
  high: "bg-terra text-terra-foreground",
  critical: "bg-destructive text-destructive-foreground",
};

export default function SymptomChecker() {
  const [form, setForm] = useState({ symptoms: "", age: "", gender: "", duration: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!form.symptoms) {
      toast.error("Describe your symptoms first");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const r = await api.post("/ai/symptom-checker", {
        symptoms: form.symptoms,
        age: form.age ? parseInt(form.age) : undefined,
        gender: form.gender || undefined,
        duration: form.duration || undefined,
      });
      setResult(r.data);
    } catch (e) {
      toast.error("AI is busy — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 fade-in">
          <div className="overline mb-2 flex items-center gap-2"><Brain className="h-3 w-3" /> Verdant AI Triage</div>
          <h1 className="font-display text-4xl font-light tracking-tight">Tell us what&apos;s wrong.</h1>
          <p className="text-muted-foreground mt-2">Powered by Gemini 3 Flash. Not a substitute for a doctor.</p>
        </div>

        <Card className="p-6 rounded-2xl mb-6">
          <Textarea
            placeholder="Describe your symptoms in your own words…"
            value={form.symptoms}
            onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
            rows={5}
            data-testid="symptom-input"
            className="rounded-xl mb-4"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input type="number" placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} data-testid="symptom-age-input" className="rounded-xl h-11" />
            <Input placeholder="Gender (optional)" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} data-testid="symptom-gender-input" className="rounded-xl h-11" />
            <Input placeholder="Duration (e.g. 3 days)" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} data-testid="symptom-duration-input" className="rounded-xl h-11" />
          </div>
          <Button onClick={run} disabled={loading} className="mt-5 rounded-full bg-primary hover:bg-primary/90 h-11 px-6" data-testid="symptom-submit-btn">
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing…</> : <>Run analysis <ArrowRight className="h-4 w-4 ml-2" /></>}
          </Button>
        </Card>

        {result && (
          <div className="space-y-6 fade-in" data-testid="symptom-result">
            <Card className="p-6 rounded-2xl">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="overline mb-2">Risk level</div>
                  <Badge className={`rounded-full text-base px-4 py-1 ${riskColors[result.risk_level] || riskColors.moderate}`} data-testid="risk-badge">
                    {result.risk_level?.toUpperCase()}
                  </Badge>
                </div>
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{result.summary}</p>
            </Card>

            <Card className="p-6 rounded-2xl">
              <div className="overline mb-3">Possible conditions</div>
              <div className="flex flex-wrap gap-2">
                {result.possible_conditions?.map((c, i) => (
                  <Badge key={i} variant="outline" className="rounded-full" data-testid={`condition-${i}`}>{c}</Badge>
                ))}
              </div>
            </Card>

            <Card className="p-6 rounded-2xl">
              <div className="overline mb-3">Recommendations</div>
              <ul className="space-y-2 text-sm">
                {result.recommendations?.map((r, i) => (
                  <li key={i} className="flex gap-2"><span className="text-terra">→</span> {r}</li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 rounded-2xl bg-primary text-primary-foreground">
              <div className="overline text-primary-foreground/70 mb-2">Suggested specialty</div>
              <div className="font-display text-3xl font-medium mb-4">{result.specialist_suggestion}</div>
              <Link to={`/doctors`}>
                <Button className="rounded-full bg-terra hover:bg-terra/90 text-terra-foreground" data-testid="find-specialist-btn">
                  Find a {result.specialist_suggestion} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

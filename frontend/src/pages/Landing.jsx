import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Leaf, Stethoscope, Brain, FileText, Calendar, Video, Sparkles, ArrowRight } from "lucide-react";

const features = [
  { icon: Calendar, title: "Effortless booking", desc: "Search by specialty, see real availability, book in seconds." },
  { icon: Video, title: "Telemedicine, simplified", desc: "Secure video consultations powered by a clean Jitsi-based room." },
  { icon: Brain, title: "AI Symptom Triage", desc: "Gemini 3 Flash listens to your concerns and suggests next steps." },
  { icon: FileText, title: "Smart record summaries", desc: "Claude Sonnet condenses dense reports into actionable insights." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <section className="relative grain-bg overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 fade-in">
            <div className="overline mb-4" data-testid="hero-overline">Verdant — Healthcare reimagined</div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.05] mb-6" data-testid="hero-heading">
              A calmer way to <em className="text-primary font-medium">care</em> for your health.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mb-8">
              Book consultations, meet your doctor over video, manage records, and get AI-assisted guidance — all in one quiet, considered place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg" className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-7 h-12" data-testid="hero-cta-primary">
                  Create an account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="rounded-full h-12 px-7 border-foreground/20" data-testid="hero-cta-secondary">
                  I already have one
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-terra" /> Gemini 3 + Claude Sonnet inside</div>
              <div className="flex items-center gap-2"><Leaf className="h-4 w-4 text-primary" /> Patient-first, by design</div>
            </div>
          </div>

          <div className="lg:col-span-6 relative fade-in-delay-2">
            <div className="relative rounded-3xl overflow-hidden shadow-lg border border-border h-[480px]">
              <img
                src="https://images.unsplash.com/photo-1665231795856-769fb08a90bc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwxfHx3YXJtJTIwbW9kZXJuJTIwY2xpbmljJTIwaW50ZXJpb3J8ZW58MHx8fHwxNzgxNzAzMzAwfDA&ixlib=rb-4.1.0&q=85"
                alt="Warm clinic"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-6 left-6 right-6 bg-background/95 backdrop-blur rounded-2xl p-5 border border-border">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-terra/15 text-terra flex items-center justify-center">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs overline mb-1">Verdant AI</div>
                    <div className="text-sm leading-relaxed">
                      Based on what you described, this sounds like a <strong>mild tension headache</strong>. I'd suggest seeing a <strong>General Practitioner</strong> if it persists over 48 hours.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-[#F5F2EB]/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-14">
            <div className="md:col-span-5">
              <div className="overline mb-3">What's inside</div>
              <h2 className="font-display text-4xl sm:text-5xl font-light tracking-tight">
                Everything you need.<br />
                <em className="text-primary font-medium">Nothing you don't.</em>
              </h2>
            </div>
            <p className="md:col-span-6 md:col-start-7 text-muted-foreground text-lg self-end">
              Four pillars hold the whole experience together — booking, telemedicine, records, and AI guidance — each tuned to feel calm rather than clinical.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  data-testid={`feature-${i}`}
                  className="bg-white border border-border rounded-2xl p-8 hover:shadow-sm transition"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-2xl font-medium mb-2">{f.title}</h3>
                  <p className="text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="overline mb-3 text-center">Built for everyone</div>
          <h2 className="font-display text-4xl sm:text-5xl font-light text-center mb-14">
            One platform. <em className="text-primary font-medium">Three views.</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { role: "Patients", lines: ["Book appointments", "Video consults", "AI symptom checker", "Records & prescriptions"], icon: Leaf },
              { role: "Doctors", lines: ["Manage availability", "Patient history", "Write prescriptions", "Video consultations"], icon: Stethoscope },
              { role: "Admins", lines: ["User & doctor management", "Departments", "Activity analytics", "Audit & reports"], icon: Sparkles },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.role} className="bg-white border border-border rounded-2xl p-8" data-testid={`role-${r.role.toLowerCase()}`}>
                  <Icon className="h-6 w-6 text-primary mb-4" />
                  <h3 className="font-display text-2xl font-medium mb-4">{r.role}</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {r.lines.map((l) => (
                      <li key={l} className="flex items-center gap-2">
                        <span className="h-1 w-1 rounded-full bg-terra" />
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-light mb-6">
            Care starts with <em className="font-medium">a single click.</em>
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Try Verdant with our demo accounts or create your own. We'll be here when you arrive.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button size="lg" className="rounded-full bg-terra hover:bg-terra/90 text-terra-foreground h-12 px-7" data-testid="footer-cta-signup">
                Create an account
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="rounded-full h-12 px-7 bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10" data-testid="footer-cta-login">
                Try demo accounts
              </Button>
            </Link>
          </div>
          <div className="mt-10 text-xs text-primary-foreground/60 font-mono">
            patient@verdant.health / patient123 &nbsp;·&nbsp; admin@verdant.health / admin123 &nbsp;·&nbsp; amara@verdant.health / doctor123
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 Verdant Health · Built with care
      </footer>
    </div>
  );
}

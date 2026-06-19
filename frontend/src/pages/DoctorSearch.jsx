import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import { api, SPECIALTIES } from "../lib/api";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Search, Star, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function DoctorSearch() {
  const [doctors, setDoctors] = useState([]);
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (specialty !== "all") params.specialty = specialty;
    const r = await api.get("/doctors", { params });
    setDoctors(r.data);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [specialty]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <div className="overline mb-2">Find care</div>
          <h1 className="font-display text-4xl font-light tracking-tight">Pick a doctor that feels right.</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or specialty…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              data-testid="doctor-search-input"
              className="pl-10 rounded-full h-12"
            />
          </div>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger className="w-full md:w-56 rounded-full h-12" data-testid="specialty-filter">
              <SelectValue placeholder="All specialties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All specialties</SelectItem>
              {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={load} className="rounded-full h-12 px-6 bg-primary hover:bg-primary/90" data-testid="doctor-search-btn">Search</Button>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-10">Loading…</div>
        ) : doctors.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl">No doctors found.</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((d) => <DoctorCard key={d.id} doctor={d} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function DoctorCard({ doctor }) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigate();

  const book = async () => {
    if (!slot || !reason) {
      toast.error("Please pick a slot and reason");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/appointments", {
        doctor_id: doctor.id,
        appointment_date: slot,
        reason,
        mode: "video",
      });
      toast.success("Appointment booked!");
      setOpen(false);
      nav("/appointments");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6 rounded-2xl hover:shadow-md transition" data-testid={`doctor-card-${doctor.id}`}>
      <div className="flex items-start gap-4 mb-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={doctor.avatar_url} />
          <AvatarFallback>{doctor.name?.split(" ").map(n => n[0]).join("")}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="font-medium">{doctor.name}</div>
          <div className="text-sm text-muted-foreground">{doctor.specialty}</div>
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 fill-terra text-terra" />
            <span className="text-xs">{doctor.rating} · {doctor.experience_years}y exp</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{doctor.bio}</p>
      <div className="flex items-center justify-between">
        <div className="font-display text-xl">${doctor.consultation_fee}</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-primary hover:bg-primary/90" data-testid={`book-btn-${doctor.id}`}>
              <Calendar className="h-3.5 w-3.5 mr-1.5" /> Book
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-medium">Book with {doctor.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="overline mb-2 block">Pick a slot</label>
                <Select value={slot} onValueChange={setSlot}>
                  <SelectTrigger className="rounded-xl h-11" data-testid="booking-slot-select">
                    <SelectValue placeholder="Choose a time" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctor.available_slots?.slice(0, 20).map((s) => (
                      <SelectItem key={s} value={s}>{new Date(s).toLocaleString()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="overline mb-2 block">Reason for visit</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  data-testid="booking-reason-input"
                  className="rounded-xl"
                  placeholder="Briefly describe your concern…"
                />
              </div>
              <Button onClick={book} disabled={submitting} className="w-full rounded-full bg-primary hover:bg-primary/90 h-11" data-testid="booking-confirm-btn">
                {submitting ? "Booking…" : `Confirm booking · $${doctor.consultation_fee}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}

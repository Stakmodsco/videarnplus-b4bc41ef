import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bitcoin, Building2, Copy, Smartphone, Upload, ArrowLeft } from "lucide-react";

type StructuredInstr = {
  amount_label?: string;
  provider?: string;
  account_name?: string;
  account_number?: string;
  network?: string;
  address?: string;
  notes?: string;
};

type Instructions = string | StructuredInstr;

const METHODS = [
  { id: "bank", icon: Building2, label: "Bank Transfer" },
  { id: "crypto", icon: Bitcoin, label: "Crypto (USDT)" },
  { id: "mobile_money", icon: Smartphone, label: "Mobile Money" },
] as const;

const Payment = () => {
  const { user, loading } = useAuth();
  const { profile } = useProfile(user?.id);
  const { level } = useParams();
  const targetLevel = Number(level);
  const [settings, setSettings] = useState<any>(null);
  const [method, setMethod] = useState<string>("bank");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("app_settings").select("*").then(({ data }) => {
      const m: any = {}; data?.forEach((r: any) => (m[r.key] = r.value)); setSettings(m);
    });
  }, []);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (![1, 2, 3].includes(targetLevel)) return <Navigate to="/upgrade" replace />;
  if (!profile || !settings) return <div className="min-h-screen"><Navbar /><div className="container py-20 text-center text-muted-foreground">Loading…</div><BottomNav /></div>;

  if (targetLevel <= profile.level) {
    return (
      <div className="min-h-screen"><Navbar />
        <div className="container py-20 text-center max-w-md">
          <p className="text-muted-foreground mb-4">You're already at Level {profile.level}. Choose a higher tier.</p>
          <Button asChild variant="hero"><Link to="/upgrade">Pick a tier</Link></Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const prices = settings.level_prices as Record<string, number>;
  const usd = Number(prices?.[String(targetLevel)] ?? 0);
  const fxRates = (settings.fx_rates ?? { NGN: 1481.47, GHS: 15 }) as Record<string, number>;
  const localAmounts = Object.entries(fxRates).map(([code, rate]) => ({
    code, value: usd * Number(rate),
  }));

  const planName = ({ 1: "Silver", 2: "Gold", 3: "Platinum" } as any)[targetLevel];
  const instructions = (settings.payment_instructions ?? {}) as Record<string, Instructions>;

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Copied");
  };

  const submit = async () => {
    if (!file) return toast.error("Please upload your payment proof");
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("proofs").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data, error } = await supabase.functions.invoke("submit-upgrade", {
        body: { target_level: targetLevel, payment_method: method, proof_url: path, notes },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Payment submitted — admin will review shortly");
      navigate("/requests");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const renderInstructions = (m: string) => {
    const raw = instructions[m];
    if (!raw) return <div className="text-sm text-muted-foreground">No instructions configured. Please contact support.</div>;

    // Legacy string format
    if (typeof raw === "string") {
      return (
        <div className="space-y-3">
          <div className="rounded-lg bg-secondary/40 border border-border p-4 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
            {raw}
          </div>
          <Button variant="outline" size="sm" onClick={() => copy(raw)}><Copy className="h-3.5 w-3.5 mr-2" /> Copy details</Button>
        </div>
      );
    }

    // Structured format
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-primary/80 uppercase tracking-wide">Amount to pay</div>
            <div className="font-display text-xl font-semibold">${usd.toFixed(2)} USD</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => copy(`${usd}`)}><Copy className="h-4 w-4" /></Button>
        </div>

        {raw.provider && <DetailRow label="Provider" value={raw.provider} />}
        {raw.network && <DetailRow label="Network" value={raw.network} />}
        {raw.account_name && <DetailRow label="Account name" value={raw.account_name} onCopy={() => copy(raw.account_name!)} />}
        {raw.account_number && <DetailRow label="Account number" value={raw.account_number} onCopy={() => copy(raw.account_number!)} mono />}
        {raw.address && <DetailRow label="Wallet address" value={raw.address} onCopy={() => copy(raw.address!)} mono />}
        {raw.notes && <div className="text-xs text-muted-foreground">{raw.notes}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-2xl py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/upgrade"><ArrowLeft className="h-4 w-4 mr-1" /> Change tier</Link></Button>
        <div className="text-xs uppercase tracking-widest text-primary mb-2">Complete your payment</div>
        <h1 className="font-display text-4xl font-semibold mb-2">Upgrade to {planName}</h1>
        <p className="text-muted-foreground mb-8">Select a payment method, send the funds, then upload your proof.</p>

        <Card className="glass-card p-6 rounded-xl text-center mb-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Plan: {planName}</div>
          <div className="font-display text-5xl font-semibold mt-2">${usd}</div>
          <div className="text-xs text-muted-foreground mt-3">
            ≈ USD {usd.toFixed(0)}
            {localAmounts.map((a) => ` | ${a.code} ${a.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)}
          </div>
        </Card>

        <Accordion type="single" value={method} onValueChange={(v) => v && setMethod(v)} collapsible={false} className="space-y-3 mb-6">
          {METHODS.map(({ id, icon: Icon, label }) => (
            <AccordionItem key={id} value={id} className="glass-card rounded-xl border-0 px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="font-medium">{label}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-5">
                {renderInstructions(id)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Card className="glass-card p-6 rounded-xl mb-6">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Upload Proof of Payment</Label>
          <label className="mt-3 block border-2 border-dashed border-border hover:border-primary/40 rounded-lg p-8 text-center cursor-pointer transition-colors">
            <Upload className="h-7 w-7 mx-auto text-primary mb-2" />
            <div className="text-sm font-medium">Click to upload</div>
            <div className="text-xs text-muted-foreground mt-1">Screenshot or PDF of your transaction</div>
            <Input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {file && <div className="text-sm text-muted-foreground mt-3 text-center">📎 {file.name}</div>}

          <Label className="text-xs uppercase tracking-wide text-muted-foreground mt-6 block">Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Transaction reference, sender name, etc." maxLength={500} className="mt-2" />
        </Card>

        <Button variant="hero" size="lg" className="w-full h-14 text-base" onClick={submit} disabled={submitting}>
          {submitting ? "Submitting…" : "I Have Paid"}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
};

const DetailRow = ({ label, value, onCopy, mono }: { label: string; value: string; onCopy?: () => void; mono?: boolean }) => (
  <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
    <div className="text-xs uppercase tracking-wide text-muted-foreground shrink-0">{label}</div>
    <div className="flex items-center gap-2 min-w-0">
      <div className={`text-sm truncate ${mono ? "font-mono" : ""}`}>{value}</div>
      {onCopy && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCopy}><Copy className="h-3.5 w-3.5" /></Button>}
    </div>
  </div>
);

export default Payment;

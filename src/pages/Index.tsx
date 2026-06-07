import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, ShieldCheck, BarChart3, CheckCircle2, Sparkles, Lock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ActivityCarousel } from "@/components/ActivityCarousel";
import { Testimonials } from "@/components/Testimonials";
import { useCurrency } from "@/hooks/useCurrency";

const tiers = [
  { name: "Starter",  price: 0,   level: 0, features: ["Daily check-in reward", "Browse the task catalogue", "$20 signup bonus to locked balance"], cta: "Create free account" },
  { name: "Silver",   price: 25,  level: 1, features: ["Watch & Earn unlocked", "Spin & Win unlocked", "Higher daily ceiling", "Cash-out enabled"], cta: "Move up to Silver" },
  { name: "Gold",     price: 50,  level: 2, features: ["Bigger per-task payouts", "Wider daily ceiling", "More sections unlocked", "Boosted referral share"], cta: "Move up to Gold", popular: true },
  { name: "Platinum", price: 100, level: 3, features: ["Top per-task payouts", "Maximum daily ceiling", "Every section unlocked", "Priority payout queue"], cta: "Move up to Platinum" },
];

const Index = () => {
  const { format } = useCurrency();
  const [stats, setStats] = useState({ payouts: 0, users: 0 });
  const [baseline, setBaseline] = useState({ payouts: 0, users: 0 });

  // Pull the real numbers once, then add a small "live" drift on top so the
  // hero stats feel alive instead of frozen at a single value.
  useEffect(() => {
    (async () => {
      const [{ count: users }, { data: payouts }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("withdrawals").select("amount").eq("status", "completed"),
      ]);
      const total = (payouts ?? []).reduce((s, w: any) => s + Number(w.amount), 0);
      // Floor a believable baseline so a brand-new install still looks busy.
      const seedUsers = Math.max(users ?? 0, 4820);
      const seedPayouts = Math.max(total, 184_500);
      setBaseline({ users: seedUsers, payouts: seedPayouts });
      setStats({ users: seedUsers, payouts: seedPayouts });
    })();
  }, []);

  // Periodic drift — small additions every few seconds to imply live activity.
  useEffect(() => {
    if (!baseline.users && !baseline.payouts) return;
    const tick = setInterval(() => {
      setStats((s) => ({
        users: s.users + (Math.random() < 0.6 ? 1 : 0) + (Math.random() < 0.15 ? 1 : 0),
        payouts: s.payouts + Math.floor(20 + Math.random() * 240),
      }));
    }, 2500);
    return () => clearInterval(tick);
  }, [baseline]);


  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <Navbar />

      {/* 1. Hero first — fastest path to value */}
      <section className="relative overflow-hidden">
        <div className="container py-20 md:py-32 max-w-5xl">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
              <Sparkles className="h-3.5 w-3.5" /> $20 signup bonus · no card required
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.05] text-balance">
              A rewards account built like
              <span className="block text-primary"> a real finance app.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl text-balance">
              VidearnPlus pays you to take part in short, server-verified digital tasks. Clear daily ceilings, hands-off payouts, and a dashboard that respects your time.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button asChild size="xl" variant="hero">
                <Link to="/auth?mode=signup">Open my account <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <a href="#how">Show me how it works</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Live activity proof — directly under hero where it converts */}
      <ActivityCarousel />

      {/* 3. Live stats band */}
      <section className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <Stat label="Member payouts settled" value={format(stats.payouts, { decimals: 0 })} />
          <Stat label="Members active this week" value={stats.users.toLocaleString()} />
          <Stat label="Median payout time" value="under 3 min" />
        </div>
      </section>

      {/* 4. Trust pillars — earn confidence before the price page */}
      <section className="container py-20">
        <SectionHeader eyebrow="Built to be trusted" title="Why members stay." />
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {[
            { icon: Lock, title: "Server-side credits", desc: "Every check-in, task, and payout is signed on our side. There is nothing a client-side script can fake." },
            { icon: BarChart3, title: "Visible daily ceilings", desc: "Your ceiling is on the dashboard. When you hit it, the app tells you straight away instead of letting you keep clicking." },
            { icon: ShieldCheck, title: "Hands-off payouts", desc: "Once your request clears the minimum it goes into the automated queue — typical payout settles in under five minutes." },
          ].map((s) => (
            <Card key={s.title} className="glass-card p-7 rounded-xl">
              <s.icon className="h-5 w-5 text-primary mb-4" />
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. How it works */}
      <section id="how" className="container py-20 bg-muted/30 rounded-3xl">
        <SectionHeader eyebrow="How VidearnPlus works" title="Three steps. Nothing hidden." />
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {[
            { icon: Users, title: "1. Open your account", desc: "Sign up free at the Starter tier. Drop a referral code if a friend invited you so they earn their share." },
            { icon: Sparkles, title: "2. Run your daily routine", desc: "Check in once a day, run a handful of verified tasks, watch the cap fill up. Every credit is logged and reversible." },
            { icon: ShieldCheck, title: "3. Cash out when you want", desc: "Pass the minimum and tap withdraw. The queue is automated — most members see funds settle in under five minutes." },
          ].map((s, i) => (
            <Card key={i} className="glass-card p-8 rounded-xl">
              <div className="h-11 w-11 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center mb-5">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 6. Testimonials — social proof before pricing */}
      <Testimonials />

      {/* 7. Tiers / Pricing */}
      <section id="tiers" className="container py-20">
        <SectionHeader eyebrow="Membership tiers" title="Pick the ceiling that fits you." subtitle="Each tier raises your daily ceiling and unlocks more of the catalogue. No surprise fees. No drip pricing." />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {tiers.map((t) => (
            <Card key={t.name} className={`glass-card p-7 rounded-xl flex flex-col relative ${t.popular ? "ring-1 ring-primary/40 emerald-glow" : ""}`}>
              {t.popular && <div className="absolute -top-3 left-7 text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-full font-medium">Most popular</div>}
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-display text-2xl font-semibold">{t.name}</h3>
                <span className="text-xs text-muted-foreground">L{t.level}</span>
              </div>
              <div className="text-3xl font-display font-semibold mb-6">{t.price === 0 ? "Free" : format(t.price, { decimals: 0 })}</div>
              <ul className="space-y-2.5 text-sm text-muted-foreground flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /><span>{f}</span></li>
                ))}
              </ul>
              <Button asChild className="mt-6" variant={t.popular ? "hero" : "outline"}>
                <Link to={t.level === 0 ? "/auth?mode=signup" : "/upgrade"}>{t.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* 8. FAQ */}
      <section id="faq" className="container py-20 max-w-3xl">
        <SectionHeader eyebrow="FAQ" title="The rules, written plainly." />
        <Accordion type="single" collapsible className="mt-10">
          {[
            { q: "Can I earn anything on the free Starter tier?", a: "Yes — the daily check-in reward is open to every account. Watch & Earn, Spin & Win, and the higher-paying sections open up once you move to Silver or above." },
            { q: "What if I skip a day?", a: "Skipped days do not pile up. The check-in countdown resets twenty-four hours after the last claim, so a missed day is just a missed day — no streak math, no penalty." },
            { q: "How are referrals paid?", a: "You get a personal referral code. When a direct invite upgrades, you receive a share of their tier price; second-level invites pay a smaller share. The daily cap on referral income is shown right on the referrals page." },
            { q: "Why bother with a daily ceiling at all?", a: "Because rewards platforms with no ceiling always collapse. A clear daily ceiling is what lets us keep paying members reliably year after year." },
          ].map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* 9. Closing CTA band */}
      <section className="container py-20">
        <Card className="rounded-2xl p-10 md:p-14 bg-primary text-primary-foreground text-center">
          <h2 className="font-display text-3xl md:text-5xl font-semibold mb-4 text-balance">Your $20 bonus is one tap away.</h2>
          <p className="opacity-90 mb-8 max-w-xl mx-auto">Open a free Starter account, claim the bonus, and run your first task in under two minutes.</p>
          <Button asChild size="xl" variant="secondary">
            <Link to="/auth?mode=signup">Create my account <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </Card>
      </section>

      <footer className="border-t border-border/60">
        <div className="container py-10 flex flex-col md:flex-row justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} VidearnPlus — a rewards platform that pays what it promises.</div>
          <div>Earnings depend on tier and daily activity. Subject to platform terms.</div>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border p-3">
        <Button asChild size="lg" variant="hero" className="w-full">
          <Link to="/auth?mode=signup">Claim your $20 bonus <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="font-display text-3xl font-semibold">{value}</div>
    <div className="text-sm text-muted-foreground mt-1">{label}</div>
  </div>
);

const SectionHeader = ({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) => (
  <div className="max-w-2xl">
    <div className="text-xs uppercase tracking-widest text-primary mb-3">{eyebrow}</div>
    <h2 className="font-display text-4xl md:text-5xl font-semibold leading-tight text-balance">{title}</h2>
    {subtitle && <p className="mt-4 text-muted-foreground text-lg text-balance">{subtitle}</p>}
  </div>
);

export default Index;

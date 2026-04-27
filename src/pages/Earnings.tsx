import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { Coins, Lock, TrendingUp, Wallet } from "lucide-react";

const Earnings = () => {
  const { user, loading } = useAuth();
  const { profile } = useProfile(user?.id);
  const { format } = useCurrency();
  const [settings, setSettings] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("app_settings").select("*").then(({ data }) => {
      const m: any = {}; data?.forEach((r: any) => (m[r.key] = r.value)); setSettings(m);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setTxns(data ?? []));
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile || !settings) return <div className="min-h-screen"><Navbar /><div className="container py-20 text-center text-muted-foreground">Loading…</div><BottomNav /></div>;

  const lvl = String(profile.level);
  const cap = Number(settings.daily_earning_caps?.[lvl] ?? 0);
  const today = new Date().toISOString().slice(0, 10);
  const earnedToday = profile.daily_earned_date === today ? Number(profile.daily_earned) : 0;
  const capPct = cap > 0 ? Math.min(100, (earnedToday / cap) * 100) : 0;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-4xl py-10">
        <BackButton />
        <div className="text-xs uppercase tracking-widest text-primary mb-2">Earnings</div>
        <h1 className="font-display text-4xl font-semibold mb-8">Your earnings</h1>

        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <BalanceCard icon={Wallet} label="Available" value={profile.balance} accent format={format} />
          <BalanceCard icon={Lock} label="Locked" value={profile.locked_balance} format={format} />
          <BalanceCard icon={TrendingUp} label="Total earned" value={profile.total_earnings} format={format} />
        </div>

        <Card className="glass-card p-6 rounded-xl mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-medium">Today's earning progress</div>
              <div className="text-xs text-muted-foreground">Resets at 00:00 UTC</div>
            </div>
            <div className="text-sm tabular-nums">
              <span className="font-semibold">{format(earnedToday)}</span>
              <span className="text-muted-foreground"> / {format(cap)}</span>
            </div>
          </div>
          <Progress value={capPct} className="h-2" />
        </Card>

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <Button asChild variant="outline" className="justify-start h-12"><Link to="/checkin-history">📅 Check-in history</Link></Button>
          <Button asChild variant="outline" className="justify-start h-12"><Link to="/receipts">🧾 Task receipts</Link></Button>
          <Button asChild variant="outline" className="justify-start h-12"><Link to="/referrals">👥 Referrals</Link></Button>
        </div>

        <Card className="glass-card p-6 rounded-xl">
          <h3 className="font-display text-xl font-semibold mb-4">Recent activity</h3>
          {txns.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-sm">No activity yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {txns.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="capitalize">{t.type}{t.notes ? ` · ${t.notes.slice(0, 30)}` : ""}</div>
                      <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`tabular-nums font-medium ${t.type === "withdrawal" ? "text-warning" : "text-primary"}`}>
                      {t.type === "withdrawal" ? "−" : "+"}{format(t.amount)}
                    </span>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

const BalanceCard = ({ icon: Icon, label, value, accent, format }: any) => (
  <Card className={`glass-card p-6 rounded-xl ${accent ? "ring-1 ring-primary/30" : ""}`}>
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2"><Icon className="h-3.5 w-3.5" />{label}</div>
    <div className="font-display text-3xl font-semibold tabular-nums">{format(value)}</div>
  </Card>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    pending: "bg-warning/15 text-warning border-warning/30",
    approved: "bg-primary/15 text-primary border-primary/30",
    completed: "bg-primary/15 text-primary border-primary/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${map[status] ?? "bg-secondary"}`}>{status}</span>;
};

export default Earnings;

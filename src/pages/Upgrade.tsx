import { useEffect, useState } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { GlossyTile } from "@/components/GlossyTile";
import { Gem, ShieldCheck, ArrowLeft, Clock, CheckCircle2, XCircle, Lock } from "lucide-react";
import { toast } from "sonner";

const TIERS = [
  { level: 1, name: "Silver", features: ["Watch & Earn unlocked", "Spin & Win unlocked", "Standard withdrawal speed", "Daily earning limit", "Community access"] },
  { level: 2, name: "Gold", popular: true, features: ["All Silver features", "Faster withdrawals (within 24h)", "Higher daily earning limit", "Referral commission boost", "Monthly bonus rewards"] },
  { level: 3, name: "Platinum", features: ["All Gold features", "Priority withdrawal review", "Maximum daily earning limit", "VIP community access", "Exclusive tasks"] },
];

type LatestUpgrade = {
  id: string;
  status: "pending" | "approved" | "completed" | "rejected" | string;
  target_level: number | null;
  notes: string | null;
  created_at: string;
};

const Upgrade = () => {
  const { user, loading } = useAuth();
  const { profile, refresh } = useProfile(user?.id);
  const { format } = useCurrency();
  const [params] = useSearchParams();
  const [settings, setSettings] = useState<any>(null);
  const [latest, setLatest] = useState<LatestUpgrade | null>(null);
  const [unlocks, setUnlocks] = useState<Set<string>>(new Set());
  const [unlocking, setUnlocking] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("app_settings").select("*").then(({ data }) => {
      const m: any = {}; data?.forEach((r: any) => (m[r.key] = r.value)); setSettings(m);
    });
  }, []);

  // Fetch the most recent upgrade transaction so we can show its status.
  // Polls every 10s while a pending upgrade exists so admin approvals
  // surface in the UI without a manual refresh.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id,status,target_level,notes,created_at")
        .eq("user_id", user.id)
        .eq("type", "upgrade")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setLatest((data as LatestUpgrade) ?? null);
      return data as LatestUpgrade | null;
    };
    load();
    const interval = setInterval(async () => {
      const cur = await load();
      // Stop polling once the upgrade is no longer pending.
      if (cur && cur.status !== "pending") clearInterval(interval);
    }, 10_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user, profile?.level]);

  useEffect(() => {
    if (!user) return;
    supabase.from("tile_unlocks").select("tile_id").eq("user_id", user.id).then(({ data }) => {
      setUnlocks(new Set((data ?? []).map((r: any) => r.tile_id)));
    });
  }, [user, profile?.level]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile || !settings) return <div className="min-h-screen"><Navbar /><div className="container py-20 text-center text-muted-foreground">Loading…</div><BottomNav /></div>;

  const prices = (settings.level_prices ?? {}) as Record<string, number>;
  const fees = (settings.tile_unlock_fees ?? {}) as Record<string, number>;
  const tierUnlocks = (settings.tier_tile_unlocks ?? {}) as Record<string, string[]>;
  const cameFromLockedTile = params.get("locked") === "1";

  const unlockTile = async (tileId: string) => {
    setUnlocking(tileId);
    try {
      const { data, error } = await supabase.functions.invoke("unlock-tile", { body: { tile_id: tileId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Section unlocked");
      setUnlocks((prev) => new Set(prev).add(tileId));
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Unlock failed");
    } finally {
      setUnlocking(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-5xl py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/dashboard"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
        <div className="text-xs uppercase tracking-widest text-primary mb-2">Membership</div>
        <h1 className="font-display text-4xl font-semibold mb-2">Upgrade your tier</h1>
        <p className="text-muted-foreground mb-8">Unlock larger daily caps, more tasks, and faster withdrawals.</p>

        {cameFromLockedTile && (
          <Card className="glass-card upgrade-watermark p-5 rounded-xl mb-6 border-primary/40 flex items-center gap-4">
            <GlossyTile icon={Lock} variant="primary" size="md" />
            <div>
              <div className="font-medium">Upgrade required</div>
              <div className="text-sm text-muted-foreground">That Ways-to-Earn task is locked. Choose a tier below to unlock more earning sections.</div>
            </div>
          </Card>
        )}

        {/* Status indicator for the most recent upgrade */}
        {latest && <UpgradeStatusBanner txn={latest} currentLevel={profile.level} />}

        <Card className="glass-card p-6 rounded-xl mb-8 flex items-center gap-5">
          <GlossyTile icon={ShieldCheck} variant="primary" size="lg" />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Current account level</div>
            <div className="font-display text-2xl font-semibold">Level {profile.level}</div>
          </div>
          <ul className="hidden md:block text-sm text-muted-foreground space-y-1">
            <li>✓ Higher earning limits</li>
            <li>✓ Priority support & rewards</li>
          </ul>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          {TIERS.map((t) => {
            const owned = profile.level >= t.level;
            const pendingForThis =
              latest?.status === "pending" && latest.target_level === t.level;
            const usd = prices[String(t.level)] ?? 0;
            return (
              <Card
                key={t.level}
                className={`glass-card rounded-xl p-6 relative flex flex-col ${t.popular ? "ring-2 ring-primary" : ""}`}
              >
                {t.popular && (
                  <span className="absolute -top-3 right-5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-primary-foreground font-medium">
                    Most popular
                  </span>
                )}
                <GlossyTile icon={Gem} variant="primary" size="md" className="mb-4" />
                <div className="font-display text-xl font-semibold">{t.name}</div>
                <div className="font-display text-4xl font-semibold mt-2">{format(usd)}</div>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2"><span className="text-primary">✓</span>{f}</li>
                  ))}
                </ul>
                {owned ? (
                  <Button disabled variant="outline" className="w-full mt-6">Current tier</Button>
                ) : pendingForThis ? (
                  <Button disabled variant="outline" className="w-full mt-6">
                    <Clock className="h-4 w-4 mr-1.5" /> Awaiting review
                  </Button>
                ) : (
                  <Button asChild variant="hero" className="w-full mt-6">
                    <Link to={`/payment/${t.level}`}>Upgrade</Link>
                  </Button>
                )}
              </Card>
            );
          })}
        </div>

        <Card className="glass-card rounded-xl p-6 mt-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-2xl font-semibold">Section unlock fees</h2>
              <p className="text-sm text-muted-foreground mt-1">Use your balance to unlock individual sections, or upgrade: Silver unlocks all except VIP, Gold unlocks all.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { id: "hookup", name: "Connect Tasks" },
              { id: "vip", name: "VIP Stream" },
              { id: "creator", name: "Creator Tasks" },
            ].map((item) => {
              const tierFree = (tierUnlocks[String(profile.level)] ?? []).includes(item.id);
              const owned = unlocks.has(item.id) || tierFree;
              return (
                <div key={item.id} className="rounded-lg border border-border bg-secondary/35 p-4">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{owned ? "Unlocked for your account" : `Unlock fee: ${format(fees[item.id] ?? 0)}`}</div>
                  <Button className="w-full mt-3" variant={owned ? "outline" : "hero"} size="sm" disabled={owned || unlocking !== null} onClick={() => unlockTile(item.id)}>
                    {owned ? "Unlocked" : unlocking === item.id ? "Unlocking…" : "Unlock section"}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <BottomNav />
    </div>
  );
};

const UpgradeStatusBanner = ({ txn, currentLevel }: { txn: LatestUpgrade; currentLevel: number }) => {
  // Treat "approved" or "completed" as success only when the level actually
  // matches what the user paid for.
  const wasApproved = (txn.status === "approved" || txn.status === "completed") && currentLevel >= (txn.target_level ?? 0);

  if (txn.status === "pending") {
    return (
      <Card className="glass-card border-warning/40 p-4 rounded-xl mb-6 flex items-center gap-4">
        <GlossyTile icon={Clock} variant="warning" size="md" />
        <div className="flex-1">
          <div className="font-medium">Verification in progress</div>
          <div className="text-sm text-muted-foreground">
            Your payment for Level {txn.target_level} is awaiting admin verification. You'll be notified the moment it's approved or rejected.
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-warning/40 text-warning bg-warning/10">Pending</span>
      </Card>
    );
  }
  if (wasApproved) {
    return (
      <Card className="glass-card border-primary/40 p-4 rounded-xl mb-6 flex items-center gap-4">
        <GlossyTile icon={CheckCircle2} variant="primary" size="md" />
        <div className="flex-1">
          <div className="font-medium">Upgrade approved 🎉</div>
          <div className="text-sm text-muted-foreground">You're now on Level {currentLevel}. New caps and rewards are active.</div>
        </div>
        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-primary/40 text-primary bg-primary/10">Approved</span>
      </Card>
    );
  }
  if (txn.status === "rejected") {
    return (
      <Card className="glass-card border-destructive/40 p-4 rounded-xl mb-6 flex items-center gap-4">
        <GlossyTile icon={XCircle} variant="danger" size="md" />
        <div className="flex-1">
          <div className="font-medium">Upgrade rejected</div>
          <div className="text-sm text-muted-foreground">
            {txn.notes?.startsWith("{") ? "Your last submission could not be verified. Try again with a valid pin and screenshot." : (txn.notes ?? "Your last submission could not be verified.")}
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border border-destructive/40 text-destructive bg-destructive/10">Rejected</span>
      </Card>
    );
  }
  return null;
};

export default Upgrade;

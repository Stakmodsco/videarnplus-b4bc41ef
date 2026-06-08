import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";
import {
  Calendar,
  Crown,
  Link2,
  Lock,
  Play,
  Sparkles,
  UserPlus,
  Users,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

type Settings = {
  daily_earning_caps: Record<string, number>;
  daily_task_limits: Record<string, number>;
  task_rewards: Record<string, Record<string, number>>;
  checkin_rewards: Record<string, number>;
  tile_unlock_fees?: Record<string, number>;
  tier_tile_unlocks?: Record<string, string[]>;
};

type Tile = {
  id: string;
  icon: any;
  title: string;
  subtitle: string;
  unlockLevel: number; // 0 = always unlocked
  premium?: boolean; // true = can be unlocked à-la-carte with a fee
  to?: string;
  action?: "checkin" | "watch" | "spin";
};

const Activities = () => {
  const { user, loading } = useAuth();
  const { profile, refresh } = useProfile(user?.id);
  const { format } = useCurrency();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [unlocks, setUnlocks] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const navigate = useNavigate();

  // Wrap any promise with a timeout so the UI never hangs forever.
  const withTimeout = <T,>(p: Promise<T>, ms = 12000): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
    ]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setTimedOut(false);
    withTimeout(
      (async () => {
        const { data, error } = await supabase.from("app_settings").select("*");
        if (error) throw error;
        const m: any = {};
        data?.forEach((r: any) => (m[r.key] = r.value));
        if (!cancelled) setSettings(m as Settings);
      })()
    ).catch((e) => { if (!cancelled) setLoadError(e?.message ?? "Failed to load settings"); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const loadCounts = async () => {
    if (!user) return;
    try {
      const start = new Date(); start.setUTCHours(0, 0, 0, 0);
      const [{ data: logs }, { data: ul }, { data: cat }, { data: comp }] = await withTimeout(Promise.all([
        supabase.from("tasks_log").select("task_type").eq("user_id", user.id).gte("completed_at", start.toISOString()),
        supabase.from("tile_unlocks").select("tile_id").eq("user_id", user.id),
        supabase.from("task_catalog").select("*").eq("active", true).order("sort_order"),
        supabase.from("task_completions").select("catalog_id").eq("user_id", user.id),
      ]));
      const counts: Record<string, number> = {};
      (logs ?? []).forEach((r: any) => { counts[r.task_type] = (counts[r.task_type] ?? 0) + 1; });
      setTaskCounts(counts);
      setUnlocks(new Set((ul ?? []).map((r: any) => r.tile_id)));
      setCatalog(cat ?? []);
      setCompletions(new Set((comp ?? []).map((r: any) => r.catalog_id)));
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load activities");
    }
  };
  useEffect(() => { loadCounts(); /* eslint-disable-next-line */ }, [user, reloadKey]);

  // Hard timeout: if anything is still missing after 15s, surface a retry UI.
  useEffect(() => {
    if (profile && settings) { setTimedOut(false); return; }
    const t = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(t);
  }, [profile, settings, reloadKey]);

  const retry = () => {
    setSettings(null);
    setLoadError(null);
    setTimedOut(false);
    setReloadKey((k) => k + 1);
    refresh?.();
  };

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  if (!profile || !settings) {
    const showError = loadError || timedOut;
    return (
      <div className="min-h-dvh">
        <Navbar />
        <div className="container py-16 max-w-md text-center">
          {showError ? (
            <>
              <div className="font-display text-2xl font-semibold mb-2">Couldn't load activities</div>
              <p className="text-sm text-muted-foreground mb-6">
                {loadError ? "Something went wrong loading your data." : "This is taking longer than expected."} Check your connection and try again.
              </p>
              <Button onClick={retry} variant="hero">Retry</Button>
            </>
          ) : (
            <div className="space-y-3 animate-pulse">
              <div className="h-8 w-40 mx-auto rounded bg-muted/60" />
              <div className="h-4 w-64 mx-auto rounded bg-muted/40" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-xl bg-muted/40" />
                ))}
              </div>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }


  const lvl = String(profile.level);
  const watchReward = settings.task_rewards.watch?.[lvl] ?? 0;
  const spinReward = settings.task_rewards.spin?.[lvl] ?? 0;
  const watchDone = taskCounts.watch ?? 0;
  const spinDone = taskCounts.spin ?? 0;
  const watchLimit = settings.daily_task_limits.watch;
  const spinLimit = settings.daily_task_limits.spin;
  const checkinReward = settings.checkin_rewards[lvl] ?? 0;
  const canCheckin = !profile.last_checkin || (Date.now() - new Date(profile.last_checkin).getTime() >= 24 * 60 * 60 * 1000);

  const fees = settings.tile_unlock_fees ?? {};
  const tierFree = settings.tier_tile_unlocks?.[lvl] ?? [];

  const tiles: Tile[] = [
    { id: "watch", icon: Play, title: "Watch & Earn",
      subtitle: profile.level >= 1 ? `+ ${format(watchReward)} • ${watchDone}/${watchLimit} today` : "Unlocks at Level 1",
      unlockLevel: 1, action: "watch" },
    { id: "checkin", icon: Calendar, title: "Daily Check-in",
      subtitle: canCheckin ? `+ ${format(checkinReward, { decimals: 3 })}` : "Available again in 24h",
      unlockLevel: 0, action: "checkin" },
    { id: "spin", icon: Sparkles, title: "Spin & Win",
      subtitle: profile.level >= 1 ? `+ ${format(spinReward)} • ${spinDone}/${spinLimit} today` : "Unlocks at Level 1",
      unlockLevel: 1, action: "spin" },
    { id: "hookup", icon: Link2, title: "Connect Tasks",
      subtitle: "Partner integrations — unlock for " + format(fees.hookup ?? 0),
      unlockLevel: 0, premium: true },
    { id: "vip", icon: Crown, title: "VIP Stream",
      subtitle: "Premium tasks — unlock for " + format(fees.vip ?? 0),
      unlockLevel: 0, premium: true },
    { id: "creator", icon: UserPlus, title: "Become a Creator",
      subtitle: "Apply to publish tasks — unlock for " + format(fees.creator ?? 0),
      unlockLevel: 0, premium: true },
  ];

  const isPremiumUnlocked = (id: string) => unlocks.has(id) || tierFree.includes(id);

  const invokeFn = async (fn: string, body: any = {}) => {
    const key = fn + JSON.stringify(body);
    setBusy(key);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Optimistically mark catalog task as completed so the button updates immediately.
      if (body?.catalog_id) {
        setCompletions((prev) => new Set(prev).add(body.catalog_id));
      }
      toast.success(data?.reward ? `+ ${format(data.reward)} earned` : "Task completed");
      await Promise.all([refresh(), loadCounts()]);
    } catch (e: any) {
      toast.error(e?.message ?? "Task failed — please try again");
    } finally {
      setBusy(null);
    }
  };

  const onTileClick = (t: Tile) => {
    // Any locked Ways-to-Earn tile goes straight to the upgrade page with the watermark enabled.
    if (profile.level < t.unlockLevel || (t.premium && !isPremiumUnlocked(t.id))) {
      toast.info("Upgrade to unlock this task");
      navigate("/upgrade?locked=1");
      return;
    }
    if (t.action === "checkin") {
      // Send to dedicated check-in flow
      navigate("/daily-checkin");
    } else if (t.action === "watch") {
      if (watchDone >= watchLimit) return toast.info("Daily limit reached");
      invokeFn("complete-task", { task_type: "watch" });
    } else if (t.action === "spin") {
      if (spinDone >= spinLimit) return toast.info("Daily limit reached");
      invokeFn("complete-task", { task_type: "spin" });
    } else if (t.premium && isPremiumUnlocked(t.id)) {
      toast.success(`${t.title} is unlocked — content coming soon`);
    }
  };

  // Compute the "next" admin task (first uncompleted)
  const nextTask = catalog.find((c) => !completions.has(c.id) && profile.level >= (c.min_level ?? 1));

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <BackButton />
        <div className="text-xs uppercase tracking-widest text-primary mb-2">Activities</div>
        <h1 className="font-display text-4xl font-semibold mb-2">Ways to earn</h1>
        <p className="text-muted-foreground mb-8">
          Complete activities to earn rewards. Unlock more tasks by upgrading or topping up.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {tiles.map((t) => {
            const tierLocked = profile.level < t.unlockLevel;
            const premiumLocked = !!t.premium && !isPremiumUnlocked(t.id);
            const locked = tierLocked || premiumLocked;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onTileClick(t)}
                disabled={busy !== null}
                className={`text-left glass-card rounded-xl p-5 relative transition-all hover:border-primary/40 ${
                  locked ? "opacity-80" : "hover:translate-y-[-2px]"
                } ${locked ? "upgrade-watermark" : ""} disabled:cursor-not-allowed`}
              >
                {locked && (
                  <span className="absolute top-3 right-3 h-6 w-6 rounded-full bg-secondary/80 border border-border grid place-items-center text-muted-foreground">
                    <Lock className="h-3 w-3" />
                  </span>
                )}
                {t.premium && isPremiumUnlocked(t.id) && (
                  <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Unlocked
                  </span>
                )}
                <div className="h-11 w-11 rounded-lg bg-primary/10 border border-primary/20 grid place-items-center mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.subtitle}</div>
              </button>
            );
          })}
        </div>

        {/* Admin-managed task list (auto-rotates) */}
        {catalog.length > 0 && (
          <Card className="rounded-xl p-5 mb-6 glass-card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-display text-lg font-semibold">Today's task</div>
                <div className="text-xs text-muted-foreground">Auto-rotates as you complete tasks ({completions.size}/{catalog.length} done)</div>
              </div>
            </div>
            {nextTask ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 rounded-lg border border-border bg-secondary/40">
                <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/20 grid place-items-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{nextTask.title}</div>
                  {nextTask.description && <div className="text-xs text-muted-foreground">{nextTask.description}</div>}
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-primary font-semibold tabular-nums text-sm">+ {format(nextTask.reward)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{nextTask.task_type}</div>
                </div>
                {(() => {
                  const taskBusyKey = "complete-task" + JSON.stringify({ catalog_id: nextTask.id });
                  const isBusy = busy === taskBusyKey;
                  return (
                    <Button
                      size="sm"
                      variant="hero"
                      disabled={busy !== null}
                      onClick={() => invokeFn("complete-task", { catalog_id: nextTask.id })}
                    >
                      {isBusy ? "Completing…" : "Complete"}
                    </Button>
                  );
                })()}
              </div>
            ) : profile.level < 2 ? (
              <button
                type="button"
                onClick={() => navigate("/upgrade?locked=1")}
                className="w-full text-left flex items-center gap-4 p-3 rounded-lg border border-border bg-secondary/40 upgrade-watermark"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/20 grid place-items-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Temporary upgraded tasks</div>
                  <div className="text-xs text-muted-foreground">Upgrade to access the rotating task list.</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">
                You've completed every published task — check back soon for new ones!
              </div>
            )}
          </Card>
        )}

        {/* Refer & Earn banner */}
        <Link to="/referrals" className="block group">
          <Card className="rounded-xl p-5 ring-1 ring-primary/30 bg-primary/10 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 grid place-items-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-display text-lg font-semibold">Refer & Earn</div>
              <div className="text-sm text-muted-foreground">Invite friends and earn 10% bonuses when they upgrade.</div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </Card>
        </Link>

        <div className="mt-8 grid sm:grid-cols-3 gap-3">
          <Button asChild variant="outline" className="justify-start h-12"><Link to="/checkin-history">📅 Check-in history</Link></Button>
          <Button asChild variant="outline" className="justify-start h-12"><Link to="/receipts">🧾 Task receipts</Link></Button>
          <Button asChild variant="outline" className="justify-start h-12"><Link to="/requests">📋 My requests</Link></Button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Activities;

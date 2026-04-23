import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Calendar,
  Crown,
  Link2,
  Play,
  Sparkles,
  UserPlus,
  Users,
  ChevronRight,
} from "lucide-react";

type Settings = {
  daily_earning_caps: Record<string, number>;
  daily_task_limits: Record<string, number>;
  task_rewards: Record<string, Record<string, number>>;
  checkin_rewards: Record<string, number>;
};

type Tile = {
  id: string;
  icon: any;
  title: string;
  subtitle: string;
  unlockLevel: number; // 0 = always unlocked
  comingSoon?: boolean;
  to?: string;
  action?: "checkin" | "watch" | "spin";
};

const Activities = () => {
  const { user, loading } = useAuth();
  const { profile, refresh } = useProfile(user?.id);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("app_settings").select("*").then(({ data }) => {
      const m: any = {};
      data?.forEach((r: any) => (m[r.key] = r.value));
      setSettings(m as Settings);
    });
  }, []);

  const loadCounts = async () => {
    if (!user) return;
    const start = new Date(); start.setUTCHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("tasks_log")
      .select("task_type")
      .eq("user_id", user.id)
      .gte("completed_at", start.toISOString());
    const counts: Record<string, number> = {};
    (data ?? []).forEach((r: any) => { counts[r.task_type] = (counts[r.task_type] ?? 0) + 1; });
    setTaskCounts(counts);
  };
  useEffect(() => { loadCounts(); /* eslint-disable-next-line */ }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile || !settings) {
    return <div className="min-h-screen"><Navbar /><div className="container py-20 text-center text-muted-foreground">Loading…</div><BottomNav /></div>;
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

  const tiles: Tile[] = [
    {
      id: "watch",
      icon: Play,
      title: "Watch & Earn",
      subtitle: profile.level >= 1
        ? `+ $${watchReward.toFixed(2)} • ${watchDone}/${watchLimit} today`
        : "Unlocks at Level 1",
      unlockLevel: 1,
      action: "watch",
    },
    {
      id: "checkin",
      icon: Calendar,
      title: "Daily Check-in",
      subtitle: canCheckin ? `+ $${checkinReward.toFixed(2)}` : "Available again in 24h",
      unlockLevel: 0,
      action: "checkin",
    },
    {
      id: "spin",
      icon: Sparkles,
      title: "Spin & Win",
      subtitle: profile.level >= 1
        ? `+ $${spinReward.toFixed(2)} • ${spinDone}/${spinLimit} today`
        : "Unlocks at Level 1",
      unlockLevel: 1,
      action: "spin",
    },
    {
      id: "hookup",
      icon: Link2,
      title: "Connect Tasks",
      subtitle: "Coming soon — partner integrations",
      unlockLevel: 2,
      comingSoon: true,
    },
    {
      id: "vip",
      icon: Crown,
      title: "VIP Stream",
      subtitle: "Premium tasks for Level 3 members",
      unlockLevel: 3,
      comingSoon: true,
    },
    {
      id: "creator",
      icon: UserPlus,
      title: "Become a Creator",
      subtitle: "Apply to publish tasks (coming soon)",
      unlockLevel: 3,
      comingSoon: true,
    },
  ];

  const invokeFn = async (fn: string, body: any = {}) => {
    setBusy(fn + JSON.stringify(body));
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data?.reward ? `+ $${Number(data.reward).toFixed(2)} earned` : "Done");
      await Promise.all([refresh(), loadCounts()]);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const onTileClick = (t: Tile) => {
    if (t.comingSoon) return;
    if (profile.level < t.unlockLevel) {
      navigate("/upgrade");
      return;
    }
    if (t.action === "checkin") {
      if (!canCheckin) return toast.info("Come back in 24h");
      invokeFn("checkin");
    } else if (t.action === "watch") {
      if (watchDone >= watchLimit) return toast.info("Daily limit reached");
      invokeFn("complete-task", { task_type: "watch" });
    } else if (t.action === "spin") {
      if (spinDone >= spinLimit) return toast.info("Daily limit reached");
      invokeFn("complete-task", { task_type: "spin" });
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 max-w-5xl">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">Activities</div>
        <h1 className="font-display text-4xl font-semibold mb-2">Ways to earn</h1>
        <p className="text-muted-foreground mb-8">
          Complete activities to earn rewards. Unlock more tasks by upgrading your account.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {tiles.map((t) => {
            const locked = profile.level < t.unlockLevel;
            const isComing = !!t.comingSoon;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onTileClick(t)}
                disabled={isComing || (busy !== null)}
                className={`text-left glass-card rounded-xl p-5 relative transition-all hover:border-primary/40 ${
                  locked || isComing ? "opacity-70" : "hover:translate-y-[-2px]"
                } disabled:cursor-not-allowed`}
              >
                {(locked || isComing) && (
                  <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-border bg-secondary/60 text-muted-foreground">
                    {isComing ? "Soon" : "Locked"}
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

        {/* Refer & Earn banner */}
        <Link to="/referrals" className="block group">
          <Card className="rounded-xl p-5 ring-1 ring-primary/30 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent flex items-center gap-4">
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

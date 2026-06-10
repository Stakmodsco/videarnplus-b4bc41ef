import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/supabaseQuery";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  balance: number;
  locked_balance: number;
  total_earnings: number;
  level: number;
  referral_code: string;
  referred_by: string | null;
  last_checkin: string | null;
  daily_earned: number;
  daily_earned_date: string | null;
  flagged: boolean;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    // Hard ceiling: never let loading stick on flaky networks.
    const t = setTimeout(() => setLoading(false), 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  return { session, user, loading };
}

// ─── Shared realtime profile subscription ─────────────────────────────────────
// Multiple components (page + UpgradeNagModal + nav, etc.) may call
// useProfile() with the same userId. Supabase only allows one subscribed
// channel per name, so we share a single channel per userId via a registry
// with reference counting. Each tab also gets its own random channel suffix
// so that multiple tabs of the same logged-in user don't collide either.

type Listener = (p: Profile) => void;

type Entry = {
  channelName: string;
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<Listener>;
  refCount: number;
};

const TAB_ID = Math.random().toString(36).slice(2, 10);
const registry = new Map<string, Entry>();

function dlog(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.debug("[realtime/profile]", ...args);
}

function subscribeProfile(userId: string, listener: Listener): () => void {
  let entry = registry.get(userId);
  if (!entry) {
    const channelName = `profile:${userId}:${TAB_ID}`;
    dlog("creating channel", channelName);
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const next = payload.new as Profile;
          dlog("update received", channelName);
          entry?.listeners.forEach((fn) => {
            try { fn(next); } catch (e) { console.error("[realtime/profile] listener error", e); }
          });
        },
      )
      .subscribe((status) => dlog("status", channelName, status));

    entry = { channelName, channel, listeners: new Set(), refCount: 0 };
    registry.set(userId, entry);
  }

  entry.listeners.add(listener);
  entry.refCount += 1;
  dlog("subscribe", entry.channelName, "refCount=", entry.refCount);

  return () => {
    const e = registry.get(userId);
    if (!e) return;
    e.listeners.delete(listener);
    e.refCount -= 1;
    dlog("unsubscribe", e.channelName, "refCount=", e.refCount);
    if (e.refCount <= 0) {
      dlog("tearing down channel", e.channelName);
      supabase.removeChannel(e.channel);
      registry.delete(userId);
    }
  };
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Hard timeout + retry: up to 3 attempts, 8s each, short backoff between.
  // Waits for the auth session to be restored from storage before querying,
  // otherwise the request goes out with the anon token and RLS hides the row
  // (the root cause of the post-login "Couldn't load your dashboard" screen).
  const refresh = async () => {
    if (!userId) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    try {
      // Ensure the session token is attached before querying (mobile-safe).
      try { await withTimeout(supabase.auth.getSession(), 4000); } catch { /* proceed anyway */ }

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { data, error } = await withTimeout(
            supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
            8000,
          );
          if (error) throw error;
          if (data) { setProfile(data as Profile); return; }
          // No row — likely token not attached yet; retry after a beat.
          throw new Error("profile-not-found");
        } catch {
          if (attempt < 3) await new Promise((r) => setTimeout(r, 700 * attempt));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [userId]);

  // Re-fetch as soon as the session token lands (covers slow mobile restores
  // where the first fetch raced ahead of auth and got filtered by RLS).
  useEffect(() => {
    if (!userId) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Fire and forget — never await inside the auth callback.
        setTimeout(() => { refresh(); }, 0);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeProfile(userId, (p) => setProfile(p));
    return () => {
      unsubscribe();
    };
  }, [userId]);

  return { profile, loading, refresh };
}

export function useIsAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!userId) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);
  return isAdmin;
}

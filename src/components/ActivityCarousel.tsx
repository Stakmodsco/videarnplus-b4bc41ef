import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { ArrowUpRight, BadgeCheck, Banknote } from "lucide-react";

type Item = {
  kind: "withdrawal" | "upgrade";
  name: string;
  amount: number;
  at: string;
};

// Anonymise: Jane D., M. Chen, etc. so we never expose full names.
function maskName(input: string | null | undefined, fallback: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return fallback;
  const parts = raw.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? fallback;
  const last = parts[1]?.[0] ? ` ${parts[1][0]}.` : "";
  return `${first}${last}`;
}

// Generates a deterministic-ish set of synthetic recent activity so the
// carousel feels alive even when the project has no real activity yet.
const SYNTHETIC: Item[] = [
  { kind: "withdrawal", name: "Amaka O.",   amount: 120, at: new Date().toISOString() },
  { kind: "upgrade",    name: "Kwame B.",   amount: 50,  at: new Date().toISOString() },
  { kind: "withdrawal", name: "Liam P.",    amount: 95,  at: new Date().toISOString() },
  { kind: "upgrade",    name: "Sara K.",    amount: 100, at: new Date().toISOString() },
  { kind: "withdrawal", name: "Noah W.",    amount: 60,  at: new Date().toISOString() },
  { kind: "upgrade",    name: "Mei L.",     amount: 25,  at: new Date().toISOString() },
  { kind: "withdrawal", name: "Adaeze N.",  amount: 240, at: new Date().toISOString() },
  { kind: "upgrade",    name: "Jamal R.",   amount: 50,  at: new Date().toISOString() },
  { kind: "withdrawal", name: "Priya S.",   amount: 75,  at: new Date().toISOString() },
  { kind: "upgrade",    name: "David O.",   amount: 100, at: new Date().toISOString() },
  { kind: "withdrawal", name: "Yara F.",    amount: 50,  at: new Date().toISOString() },
  { kind: "upgrade",    name: "Hassan T.",  amount: 25,  at: new Date().toISOString() },
];

export const ActivityCarousel = () => {
  const { format } = useCurrency();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: w }, { data: u }] = await Promise.all([
        supabase
          .from("withdrawals")
          .select("amount, requested_at, profiles!inner(full_name)")
          .eq("status", "completed")
          .order("requested_at", { ascending: false })
          .limit(15),
        supabase
          .from("transactions")
          .select("amount, created_at, target_level, profiles:profiles!inner(full_name)")
          .eq("type", "upgrade")
          .in("status", ["approved", "completed"])
          .order("created_at", { ascending: false })
          .limit(15),
      ]);
      if (cancelled) return;

      const real: Item[] = [
        ...((w ?? []).map((r: any, i: number) => ({
          kind: "withdrawal" as const,
          name: maskName(r.profiles?.full_name, `Member ${i + 1}`),
          amount: Number(r.amount),
          at: r.requested_at,
        }))),
        ...((u ?? []).map((r: any, i: number) => ({
          kind: "upgrade" as const,
          name: maskName(r.profiles?.full_name, `Member ${i + 1}`),
          amount: Number(r.amount),
          at: r.created_at,
        }))),
      ];

      // Dedupe by name — first occurrence wins, then top up with synthetic
      const seen = new Set<string>();
      const merged: Item[] = [];
      for (const it of [...real, ...SYNTHETIC]) {
        const key = it.name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(it);
        if (merged.length >= 16) break;
      }
      setItems(merged);
    })();
    return () => { cancelled = true; };
  }, []);

  // Duplicate the list so the marquee loop is seamless
  const loop = useMemo(() => [...items, ...items], [items]);

  if (items.length === 0) return null;

  return (
    <div className="w-full bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 border-y border-primary/20 overflow-hidden relative">
      <div className="flex animate-marquee whitespace-nowrap py-2.5">
        {loop.map((it, i) => (
          <div key={`${it.name}-${i}`} className="flex items-center gap-2 mx-5 text-sm">
            {it.kind === "withdrawal" ? (
              <Banknote className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <ArrowUpRight className="h-4 w-4 text-accent shrink-0" />
            )}
            <span className="font-medium">{it.name}</span>
            <span className="text-muted-foreground">
              {it.kind === "withdrawal" ? "withdrew" : "upgraded for"}
            </span>
            <span className="font-semibold text-primary tabular-nums">{format(it.amount)}</span>
            <BadgeCheck className="h-3.5 w-3.5 text-primary/70" />
          </div>
        ))}
      </div>
    </div>
  );
};

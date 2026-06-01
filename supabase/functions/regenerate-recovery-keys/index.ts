import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getIp = (req: Request) =>
  (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
  req.headers.get("cf-connecting-ip") ||
  "unknown";

async function sha256(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateKeys(): string[] {
  return Array.from({ length: 10 }, () =>
    crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const sb = createClient(url, service, { auth: { persistSession: false } });

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

  const userId = claims.claims.sub as string;
  const email = claims.claims.email as string | undefined;
  if (!email) return json({ error: "Account has no email on file" }, 400);

  const ip = getIp(req);

  // Rate limit: 5 regenerations per IP per 15 min
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await sb
    .from("signup_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("kind", "regen_keys")
    .gte("created_at", since);

  if ((count ?? 0) >= 5) {
    return json({ error: "Too many attempts. Please try again later." }, 429);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const currentPassword = String(body?.currentPassword ?? "");
  if (!currentPassword) return json({ error: "Current password required" }, 400);

  // Verify current password by attempting sign-in
  const verifier = createClient(url, anon, { auth: { persistSession: false } });
  const { error: signInErr } = await verifier.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInErr) {
    await sb.from("signup_attempts").insert({
      ip, email, success: false, kind: "regen_keys", reason: "bad_password",
    });
    return json({ error: "Current password is incorrect" }, 400);
  }

  // Invalidate old keys (delete) then insert fresh hashed keys
  const newKeys = generateKeys();
  const hashes = await Promise.all(newKeys.map(sha256));

  const { error: delErr } = await sb.from("user_recovery_keys").delete().eq("user_id", userId);
  if (delErr) return json({ error: "Could not rotate keys" }, 500);

  const { error: insErr } = await sb.from("user_recovery_keys").insert(
    hashes.map((h) => ({ user_id: userId, recovery_key_hash: h, used: false }))
  );
  if (insErr) return json({ error: "Could not save new keys" }, 500);

  await sb.from("signup_attempts").insert({
    ip, email, success: true, kind: "regen_keys", reason: null,
  });

  return json({ ok: true, recoveryKeys: newKeys });
});

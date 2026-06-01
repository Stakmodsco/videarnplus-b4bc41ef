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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = getIp(req);
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Rate limit: max 5 password-recovery attempts per IP in 15 minutes
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await sb
    .from("signup_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("kind", "password_recovery")
    .gte("created_at", since);

  if ((count ?? 0) >= 5) {
    await sb.from("signup_attempts").insert({
      ip, email: null, success: false, kind: "password_recovery", reason: "throttled",
    });
    return json({ error: "Too many attempts. Please try again in 15 minutes." }, 429);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const recoveryKey = String(body?.recoveryKey ?? "").replace(/\s/g, "").toUpperCase();
  const password = String(body?.password ?? "");

  const fail = async (reason: string, msg: string, status = 400) => {
    await sb.from("signup_attempts").insert({
      ip, email: email || null, success: false, kind: "password_recovery", reason,
    });
    return json({ error: msg }, status);
  };

  if (!email || !recoveryKey || !password) return fail("missing_fields", "Missing required fields");
  if (password.length < 8 || password.length > 72)
    return fail("weak_password", "Password must be 8–72 characters");
  if (recoveryKey.length !== 12) return fail("bad_format", "Invalid recovery key format");

  const { data: usersData, error: usersErr } = await sb.auth.admin.listUsers();
  if (usersErr) return fail("lookup_failed", "Could not verify account");

  const user = usersData.users.find((u) => u.email?.toLowerCase() === email);
  // Don't reveal whether email exists — return the same error as invalid key
  if (!user) return fail("user_not_found", "Invalid email or recovery key");

  const hash = await sha256(recoveryKey);

  const { data: keyRow } = await sb
    .from("user_recovery_keys")
    .select("id, used")
    .eq("user_id", user.id)
    .eq("recovery_key_hash", hash)
    .maybeSingle();

  if (!keyRow) return fail("invalid_key", "Invalid email or recovery key");
  if (keyRow.used) return fail("key_used", "This recovery key has already been used");

  const { error: updErr } = await sb.auth.admin.updateUserById(user.id, { password });
  if (updErr) return fail("update_failed", updErr.message);

  await sb.from("user_recovery_keys").update({ used: true }).eq("id", keyRow.id);

  await sb.from("signup_attempts").insert({
    ip, email, success: true, kind: "password_recovery", reason: null,
  });

  return json({ ok: true });
});

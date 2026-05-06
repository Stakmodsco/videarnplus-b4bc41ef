import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Circle } from "lucide-react";
import { checkPassword, passwordError } from "@/lib/passwordRules";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase puts recovery tokens in the URL hash and signs the user in.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const checks = checkPassword(password);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = passwordError(password);
    if (err) return toast.error(err);
    if (password !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated — please sign in");
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container max-w-md py-16">
        <Card className="glass-card p-8 rounded-xl">
          <h1 className="font-display text-3xl font-semibold mb-2">Set a new password</h1>
          <p className="text-muted-foreground text-sm mb-6">Choose a strong password you haven't used before.</p>
          {!ready ? (
            <div className="text-sm text-muted-foreground">Verifying your reset link…</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">New password</Label>
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" />
                {password.length > 0 && (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[11px]">
                    {checks.map((c) => (
                      <li key={c.id} className={`flex items-center gap-1.5 ${c.ok ? "text-primary" : "text-muted-foreground"}`}>
                        {c.ok ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                        {c.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Confirm password</Label>
                <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;

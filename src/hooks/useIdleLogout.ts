import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Auto-signs the user out after `timeoutMs` of inactivity. Listens to common
 * user-input events to reset the timer. No effect when not signed in.
 */
export function useIdleLogout(timeoutMs: number = 15 * 60 * 1000) {
  const navigate = useNavigate();

  useEffect(() => {
    let timer: number | undefined;

    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        await supabase.auth.signOut();
        toast.info("You've been signed out due to inactivity.");
        navigate("/auth");
      }, timeoutMs);
    };

    const events: (keyof WindowEventMap)[] = [
      "mousemove", "mousedown", "keydown", "touchstart", "scroll", "visibilitychange",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [navigate, timeoutMs]);
}

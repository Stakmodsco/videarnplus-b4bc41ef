import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Inbox } from "lucide-react";

type Props = {
  state: "loading" | "error" | "empty";
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

/**
 * Reusable Loading / Error / Empty fallback for any Supabase-driven page.
 * Centralises copy + retry affordance so screens can't get stuck silently.
 */
export const StatusFallback = ({
  state,
  title,
  message,
  onRetry,
  retryLabel = "Retry",
  className = "",
}: Props) => {
  if (state === "loading") {
    return (
      <div className={`w-full grid place-items-center py-16 ${className}`}>
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <div className="text-sm">{message ?? "Loading…"}</div>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={`w-full grid place-items-center py-16 px-4 ${className}`}>
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-destructive/10 grid place-items-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="font-display text-xl font-semibold mb-1">
            {title ?? "Something went wrong"}
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            {message ?? "We couldn't load this screen. Check your connection and try again."}
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="hero" size="sm">
              {retryLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full grid place-items-center py-16 px-4 ${className}`}>
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
          <Inbox className="h-5 w-5 text-primary" />
        </div>
        <div className="font-display text-lg font-semibold mb-1">
          {title ?? "Nothing here yet"}
        </div>
        <p className="text-sm text-muted-foreground">
          {message ?? "Come back soon — new items will appear here."}
        </p>
      </div>
    </div>
  );
};

export default StatusFallback;

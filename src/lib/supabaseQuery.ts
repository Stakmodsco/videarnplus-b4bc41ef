// Shared timeout wrapper so Supabase (or any promise) never leaves the UI
// stuck on a perpetual loading state. Rejects with an Error("timeout") after
// `ms` milliseconds — callers can branch on err.message === "timeout".
export const withTimeout = <T,>(p: PromiseLike<T>, ms = 12000): Promise<T> =>
  Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error("timeout")), ms)
    ),
  ]);

export const isTimeoutError = (e: unknown) =>
  e instanceof Error && e.message === "timeout";

import React from "react";

// Minimal error boundary used to isolate always-mounted overlay components
// (e.g. UpgradeNagModal) so that a transient render error — including HMR
// "Should have a queue" glitches during dev — never blanks the entire app.
type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = { hasError: boolean };

export class SafeBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn("[SafeBoundary] swallowed render error", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

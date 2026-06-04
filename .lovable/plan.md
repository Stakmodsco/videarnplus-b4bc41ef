# Sequenced rollout

Tackling everything in 4 rounds. Each round ends in a working preview so you can review before the next.

## Round 1 — Branding & visual polish
1. **Modal overflow audit** — sweep every `DialogContent` / popup (AuthNudgeModal, UpgradeNagModal, SupportBot escalate panel, payment dialogs, admin ticket modal, recovery-key reveal). Add `w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] overflow-hidden`, wrap long strings with `break-words`, make footers `flex-wrap`. Verify at 320 / 375 / 414 px.
2. **Remove remaining gradients** — grep for `bg-gradient`, `from-`, `to-`, `via-`, `linear-gradient`, `radial-gradient`, `--gradient-*` and flatten each to a single `hsl(var(--primary))` / surface token. Includes SupportBot header bubble, launcher button, GlossyTile, hero sections, BrandLogo sheen.
3. **BrandLogo crispness** — remove the white inner-sheen gradient, tighten the V geometry, snap stroke/fill to even pixels, expose `size` defaults for navbar (28), hero (96), mobile header (24). Replace any leftover usages.
4. **Favicon + OG** — render BrandLogo to `public/favicon-512.png` (and 32 / 180), wire `<link rel="icon">`, `apple-touch-icon`, and `og:image` in `index.html`. Drop the existing `public/favicon.ico`.

## Round 2 — Content refresh (zero original-site overlap)
5. **Marquee data** — new pool of 120+ withdrawals, mixed currencies (USD/EUR/GBP/INR/NGN/PHP/BRL/KES/MXN/IDR), no-repeat shuffler, faster scroll.
6. **Testimonials** — fresh roster of names, countries, quotes, avatars (generated initials), new layout cadence.
7. **Landing copy** — Hero, value-props, How-It-Works, FAQ, footer, CTA copy all rewritten in VidearnPlus voice. Same goes for Auth, Dashboard, Upgrade, Withdraw, Profile microcopy where it still echoes the original.

## Round 3 — Support escalation flow (backend wired)
8. SupportBot already has an escalate button + ticket form; this round verifies the end-to-end loop:
   - confirm `support_tickets` insert + `support-attachments` upload work for anon and authed users,
   - add **admin ticket inbox enhancements**: reply box (writes back to `ticket_replies` table — new), realtime status, signed-URL attachment preview already present,
   - email-less notification: surface unread-ticket badge in admin sidebar.
   - Migration: new `ticket_replies` table + RLS (admin write, user read own).

## Round 4 — Icons + Task tracking
9. **Icon system swap** — install `@fluentui/react-icons`, create `<FluentIcon name="..." />` wrapper mapping Lucide names → Fluent Color equivalents, then codemod call-sites. Keep `Icon3D` (Fluent Emoji) for hero/feature spots; Fluent UI Color icons take over chrome (nav, buttons, list rows). Replace the attached pixel icon everywhere with the matching 3D Fluent Emoji.
10. **Task links + time-limit tracking** —
    - schema: add `task_url` (already exists), `duration_seconds` (new, default 30), `min_active_seconds` to `task_catalog`.
    - admin task editor gets URL + duration fields.
    - user flow: clicking a task opens `task_url` in a new tab AND starts a server-anchored timer (`task_attempts` table: started_at, completed_at, focus_ms).
    - client tracks tab focus via `document.visibilityState` + `window.focus/blur`, posting heartbeats every 5s to `record-task-heartbeat` edge function.
    - reward only credited when accumulated focus_ms ≥ `min_active_seconds * 1000` AND the user returns and clicks "I'm done".
    - Anti-cheat: server caps heartbeats to wall-clock elapsed; multiple concurrent attempts blocked.

## Technical notes

- Round 1–2 are pure frontend (no migrations).
- Round 3 needs 1 migration (`ticket_replies`).
- Round 4 needs 1 migration (task duration columns + `task_attempts`) and 1 new edge function (`record-task-heartbeat`).
- Fluent UI Icons add ~40KB gz after tree-shaking — fine.
- I'll keep your earlier `Icon3D` wrapper (Fluent Emoji) for decorative spots and use Fluent UI Color for functional chrome.

## Open question

You skipped the task-links detail. I'll default to: **admins set the URL and required active-seconds per task; client tracks tab focus via Visibility API; reward credited only if focus ≥ required**. Tell me now if you'd rather have a different anti-cheat strength (e.g. require mouse movement, randomized prompts mid-watch, etc.) — otherwise I'll ship the default.

Reply **go** to start Round 1, or edit any step.
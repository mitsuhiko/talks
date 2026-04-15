# Concrete Ideas (Short List)

- **[Core Thesis: Breathe]** Every mutating subsystem needs a clear **stabilize button** (pause/disable path that stops things getting worse).
- **[Core Thesis: Breathe]** For each critical service, document the exact 2-minute incident action: who presses what, where.
- **[P1]** Start with one boring path first (one queue, one write path, one transaction) before adding orchestration.
- **[P1]** Add complexity only behind a measurable trigger (explicit metric + threshold, not vibes).
- **[P2]** Design schema/indexes from real access patterns and tenant hotspots.
- **[P2/P5]** Prefer explicit **raw SQL**.
- **[P3]** Use append-only event logs (plus outbox where needed) for important state transitions.
- **[P4]** Model business time from event timestamps/cursors, not assumed cron schedule.
- **[P5]** Put idempotency keys on all command boundaries (APIs, jobs, workflows).
- **[P5]** Use DB concurrency primitives (`SELECT ... FOR UPDATE`, atomic updates) where writes contend.
- **[P6]** Use expand/contract rollouts: schema first, compatibility phase, then cleanup.
- **[P7]** One DB↔domain mapping layer; defaults/legacy handling only there.
- **[P7]** Keep domain types strict and mostly non-null; resolve nullable storage at boundaries.
- **[P8]** Make debugging first-class: structured logs + correlation IDs + SQL timing + user-impact metrics.
- **[P9/P10]** Crash on invariant violations, DLQ poison work, and treat refactors as done only after old paths are deleted.

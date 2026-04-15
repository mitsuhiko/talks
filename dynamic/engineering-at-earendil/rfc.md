# Motivation

Engineering for online products is not a contest in cleverness. It is the discipline of producing systems that behave predictably in production, especially under stress.

Predictability is what separates a manageable incident from a chaotic one. It determines whether on-call response feels calm or panicked, whether fixes are safe or risky, and whether teams can continue shipping without fear.

The practical test is simple: if something fails at 2AM, we should be able to stabilize quickly, apply a safe mitigation, and return later for the deeper repair.

# Core Thesis

We build systems to create breathing room.

Breathing room means:

- If we do nothing for ten minutes, blast radius stays bounded.
- We have explicit controls to stop the system from getting worse.
- Recovery paths are clear, reversible, and safe under pressure.

This RFC defines the engineering defaults that make that behavior reliable.

# Scope and Non-Goals

This RFC applies to service and data-path design for SaaS and online systems: APIs, workers, jobs, pipelines, rollouts, and incident operations.

This RFC does **not** aim for perfect uptime. It aims for **controllable failure**.

This RFC is also not anti-complexity. It is anti-unjustified complexity. We add complexity when production evidence demands it, not when architecture diagrams suggest it.

# System Model

At minimum, our systems:

- Maintain durable state.
- Accept inputs and emit outputs that mutate state.

From this model, one consequence follows: system quality is mostly the quality of state transitions under real conditions (delay, retries, concurrency, partial rollouts, and failures). If transition behavior is sound, systems remain operable. If transition behavior is fragile, incidents escalate quickly.

# Engineering Principles

1. **Start with the dumbest solution first.**
   - Complexity compounds operational cost and failure modes.
   - Start with one clear path (for example, one queue, one write path).
   - Add sophistication only when concrete production signals show the simple path is insufficient.
   - Define those signals up front so complexity decisions are explicit.

2. **Design data before designing abstractions.**
   - Data model design is system design.
   - Make access patterns, growth expectations, and hotspot risks explicit early.
   - Decide partitioning and sharding boundaries deliberately.
   - No framework or “smart data layer” can compensate for bad keys, fanout, or unbounded joins.

3. **Prefer event-based state transitions.**
   - Represent significant state changes as explicit events.
   - Keep replay and recovery possible.
   - Ensure delayed processing still preserves correctness.
   - This is not mandatory for every subsystem, but it is the first model to evaluate for reliability-critical flows.

4. **Treat wall-clock assumptions as unsafe by default.**
   - “This always runs at 02:00” is not a reliable invariant.
   - Queues stall, jobs drift, and incidents delay scheduled work.
   - Correctness should rely on event timestamps and transition logic, not scheduler punctuality.

5. **Design writes for concurrency, not hope.**
   - “Usually non-conflicting” is not a strategy.
   - Prefer exclusive ownership of write domains when feasible.
   - When multiple writers exist, use safe primitives: locks, atomic updates, idempotency keys, and durable retries.
   - Concurrency outcomes must be deterministic or intentionally merged.

6. **Assume rollouts are non-atomic.**
   - Schemas, services, workers, and clients do not upgrade simultaneously.
   - Old and new behavior will coexist during rollout windows.
   - Safe sequence: migrate storage shape, deploy tolerant code, then rely on the new semantics.

7. **Transform data once at boundaries.**
   - Normalize DB/API data at ingress and serialize at egress in dedicated boundary code.
   - Handle nullability, legacy fields, and defaults there.
   - Keep business logic on stable, required domain shapes.
   - This avoids scattered defaulting and divergent behavior.

8. **Make observability a functional requirement.**
   - If you cannot see the system, you cannot operate it.
   - During incidents, we must answer quickly: what failed, who is impacted, since when, and where.
   - Minimum bar: structured logs, correlation IDs, latency visibility, and counters for retries/failures/dead letters.
   - Every incident should leave instrumentation better than before.

9. **Learn to crash safely.**
   - Fail fast on broken invariants.
   - Restart from durable state.
   - Make retry paths idempotent.
   - Silent corruption is worse than visible failure.

10. **Finish migration and refactor work completely.**
    - Half-complete changes multiply operational surface area.
    - Every migration requires an owner, an end state, and a deadline.
    - “Done” includes deleting old paths and obsolete compatibility logic.

# Incident Stabilization Interface

Every critical system should expose explicit stabilization controls that operators can apply under pressure without code changes.

Minimum expected controls:

- Pause queue consumers.
- Disable mutating writes in affected domains.
- Route traffic to known-safe read paths or degraded modes.
- Open circuit breakers for unhealthy dependencies.
- Divert failed or risky work into replayable queues (DLQ).
- Stop scheduler triggers safely without losing already accepted work.

These controls must be documented, tested, and rehearsed.

# Queue and QoS Policy

Queue depth is not customer value. During disruptions, stale work often accumulates faster than humans can recover it.

Operational guidance:

- Prioritize current user impact over historical backlog completion.
- Consider newest-first catch-up modes when old items have decayed in value.
- Apply TTLs, load shedding, or intentional tail dropping for stale tasks.
- Prefer explicit replay strategy over accidental retry storms.

This policy prevents teams from spending recovery time on work that no longer matters.

# Operational Expectations

The following are baseline expectations for production ownership:

- Runbooks include concrete “stabilize now” steps.
- Alerts are tied to user impact, not internal noise alone.
- Correlation across request, job, and workflow boundaries is available.
- Rollout plans explicitly model mixed-version coexistence.
- Postmortems produce concrete guardrails (instrumentation, checks, templates, or automation).

# Adoption

Apply this RFC incrementally to new work and when touching existing systems.

Design and review checklists should require explicit statements for:

- stabilization path,
- data shape and partition assumptions,
- concurrency safety,
- rollout compatibility strategy,
- boundary transformation ownership,
- observability coverage.

Success should be measured by shorter time-to-stabilize, safer mitigations, clearer diagnostics, and reduced long-term complexity.

# Decision

Adopt this RFC as the default engineering posture for online systems at Earendil.

The intended outcome is not perfect uptime. The intended outcome is controllable failure, predictable operations, and sustained engineering confidence.

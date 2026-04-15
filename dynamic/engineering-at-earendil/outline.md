# Engineering at Earendil

The goal of engineering for online services and SaaS products is to produce the
right code that behaves as predictably as possible in production.

Predictability is what determines whether incidents are manageable or chaotic,
whether operations feel calm or exhausting, and whether a codebase remains
joyful to work in over time.  The goal is that if shit goes wrong at 2AM in the
morning, you can quickly patch it up and go to bed and deal with it properly
when your brain has capacity.

## Core Thesis: Breathe

We want to build systems so that we have breathing room.

When an incident starts, the system should not get worse just because time
passes.  If we do nothing for 10 minutes while we investigate, the blast radius
should stay bounded.  Better yet, there should be a "stabilize" button that
makes things not worse.

Examples of "stabilize" actions:

- suspected data corruption: pause queue consumers and disable mutating writes
- bad downstream behavior: open circuit breakers and queue work for later replay
- runaway cron/workflow: disable scheduler trigger without losing already accepted work
- risky rollout: stop new workers and fall back to known-safe read/write paths

This only works if we design for it on purpose: clear kill switches, pausable
queues, idempotent processing, and read-only/degraded modes.

The principles below are concrete ways to engineer that breathing room.

## The Basics

At its simplest, a SaaS system does two things:

1. Maintains state (typically in a database and related services)
2. Accepts inputs and emits outputs that mutate that state via APIs

If that is true, then system design should prioritize correctness of state
transitions under real-world conditions: delay, retries, concurrency, partial
rollouts, and failure.

Yet in practice it's very easy to fail here and even at minor scale complexity
becomes pain:

- more failure modes
- harder incident response
- stronger coupling to hidden assumptions
- lower confidence in changes

So we need explicit engineering principles that shape the codebase toward
predictability.  It's very easy to miss these things

## Principle 1: Start With The Dumbest Solution First

Complexity is debt with compounding interest.  So start with the simplest
solution that is clearly correct and easy to operate, and only add complexity
when reality proves you need it.

That means:

- one boring queue before a distributed orchestration graph
- one straightforward write path before dual-write cleverness
- one database transaction before introducing cross-service consistency protocols

This is not anti-ambition.  It is anti-fantasy.  You should be able to state
exactly what signal means "the simple approach no longer works" before adding
new moving parts.

Abstractions can kill you if they are badly designed.  Only add abstractions if you

- Absolutely need to hide internal invariants
- You have seen a pattern 3 times or more in the codebase

Many abstractions are over-designed for future problems that never merged and become
a problem in the process.  Some examples of bad tradeoffs are often ORMs instead of
SQL, complex code generators and meta programming etc.

## Principle 2: Learn To Design Your Data

Data model design is system design.  No amount of application cleverness can
fully compensate for bad data layout.

For SaaS systems, understand upfront:

- access patterns (reads vs writes, hot paths)
- cardinality and growth
- hotspot risk (tenant skew, hot keys, lock contention)
- partitioning/sharding boundaries

You can postpone scaling work, but you cannot indefinitely postpone data shape
decisions.  Bad foundations eventually become expensive migrations.

## Principle 3: Prefer Event-Based State Transitions

Append-only/event-style systems are often the strongest model for correctness:

- state changes are represented as explicit events
- replay/recovery is possible
- delayed processing remains conceptually valid
- replication tends to be clearer

This is not always the right model for every subsystem, but it is the **first
tool to consider** because it most faithfully captures “what happened.”

## Principle 4: Mind The Clock

Time assumptions are one of the easiest ways to introduce production bugs.

Bad assumption:
- “This job always runs at 02:00.”

Reality:
- queues stall
- incidents happen
- jobs are delayed for hours or days

If code depends on wall-clock schedule assumptions, correctness collapses under
delay. If code depends on explicit event data and transition logic, backlog
processing can still produce correct outcomes.  Things might start to run
concurrently that normally don't.

## Principle 5: Design Writes for Concurrency, Not Hope

“Probably non-conflicting in production” is not a strategy.  Write paths should
be safe by construction:

- single/exclusive writers where possible
- merge-friendly data models where multiple writers are required
- database primitives that serialize safely (e.g. `SELECT ... FOR UPDATE`, atomic increments)

There are great tools to help with this:

- Idempotency keys
- Durable workflows (that's what we have absurd for!)

The goal is to make concurrent execution resolve naturally, not accidentally.

## Principle 6: Assume Rollouts Are Non-Atomic

In production, nothing rolls out everywhere at once:

- schema changes arrive first
- workers/services update later
- old and new code coexist for a period

So deployment-compatible evolution is mandatory:

1. apply schema migration first
2. deploy code that can tolerate both old and new shapes
3. only then rely on the new schema

Teams can sometimes get away with simultaneous assumptions at low scale; this
fails at larger scale.

## Principle 7: Transform Data Once at the Boundary

A common anti-pattern is scattered defaulting and shape-fixing across the
codebase.

Why it is dangerous:

- defaults diverge
- behavior becomes inconsistent
- migration logic leaks into business logic

Preferred pattern:

- centralize DB to application transformation in a small number of functions.
- centralize application to DB serialization similarly.
- make these boundary functions the **only place** that fills defaults and handles legacy fields.

Application-level objects should represent the true shape business logic expects.

- If a field is required in business logic, it should be non-null/non-optional in the application type.
- If storage can be missing/nullable during migration windows, the boundary layer resolves that once.

Business logic should not repeatedly re-handle storage uncertainty.

## Principle 8: Make Observability First-Class

If you cannot see the system, you cannot operate it.  Observability is not a
nice-to-have; it is part of the feature.

At 2AM, we should be able to answer in minutes:

- what is broken
- who is impacted
- since when
- where in the pipeline it failed

Minimum bar:

- structured logs at important boundaries (request in/out, state transition, external call)
- correlation IDs threaded across services, jobs, and workflow steps
- timing for SQL and external calls, with slow-query visibility
- counters for success, failure, retries, and dead-letter outcomes
- dashboards and alerts tied to user impact, not just internal noise

Every incident should improve instrumentation so the same class of failure is
faster to diagnose next time.

## Principle 9: Learn To Crash

The best production systems know how to fail loudly, fast, and recover cleanly.
A process crash is often preferable to silently continuing with corrupted or
ambiguous state.

Key idea:

- crash on broken invariants
- restart from durable state
- make retries idempotent

If a service can be restarted any time without data corruption, incident
handling gets dramatically simpler.  "Crash-only" behavior is a feature.

## Principle 10: Finish The Work

Half-done refactors are worse than no refactor at all.  You pay the migration
cost, but never collect the simplification benefit.

The failure mode is predictable: now there are two paths, two data models, and
two places bugs can hide.

So every refactor/migration needs:

- an explicit end state
- an owner
- a deadline
- deletion of the old path as part of "done"

Don't celebrate "new path added."  Celebrate "old path removed."

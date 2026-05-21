# A Year of Building AI Agents — Notes

These notes preserve the original slide content and speaking cues. The live slides now act as short visual backdrops.

## 1. A Year of Building AI Agents

**Backdrop:** A Year of Building AI Agents

Open with the year-long arc: practical learnings from building agents and building with agents.

- Code Crafts · May 21, 2026 · Vienna
- Armin Ronacher · Earendil

## 2. Who Am I?

**Backdrop:** Armin Ronacher · Builder. Maintainer. Founder.

Reuse the old intro, but make clear this talk comes from operating experience at Earendil and long experience maintaining software.

- Armin Ronacher, founder at Earendil.
- Created Flask, Jinja2, and a lot of Open Source software.
- Spent 10 years helping build Sentry.
- I write at `lucumr.pocoo.org` about agentic engineering.


## 3. Contact Intro

**Backdrop:** Armin Ronacher · lucumr.pocoo.org · x.com/mitsuhiko · github.com/mitsuhiko

Introduce myself: Armin Ronacher. Blog at lucumr.pocoo.org, on X as x.com/mitsuhiko, and GitHub at github.com/mitsuhiko.

## 4. Building Agents, With Agents

**Backdrop:** Building Agents, With Agents

Set the framing: this is about the double exposure of building agents and using agents to build them.

- This talk is about building agents — and building agents with agents.
- At Earendil we build Pi and Lefos, two agents for different user groups.
- Pi is for developers; Lefos is for people who want more thoughtful communication.
- The learnings come from building these systems and using agents to build them.

## 5. The Double Exposure

**Backdrop:** Product and Process

The central framing: agents are both the product category and the way we now build the product.

**We build agents**

- Long-running loops.
- Tools, state, files, policy.
- Generated code that acts.

**We build with agents**

- Planning, coding, review.
- Debugging and operations.
- More contributors, more output.

## 6. What I Mean by “Agent”

**Backdrop:** Loop + Tools + World

Define agent concretely for this talk: Claude Code inspired systems, not vague autonomy.

- A Claude Code inspired system: an LLM in a loop.
- It is hooked up to tools that can observe or change the world.
- The important tools are file system manipulation, code generation, and code execution.
- Each action produces output that feeds the next turn.

## 7. Agency

**Backdrop:** Agency Is Human

Clarify the terminology discomfort: agency and responsibility should stay human.

- I hate the word “agent.”
- Agency belongs to humans, not machines.
- But “agent” is the word the industry uses.

## 8. Write Code, Run Code

**Backdrop:** Write. Run. Read.

The core capability: writing code and running code creates the feedback loop that makes these systems powerful.

- The model can write a small program for the thing it wants to do.
- The harness runs it and returns stdout, stderr, files, logs, screenshots, or test results.
- The model reads that feedback and changes course.
- That write-run-read loop is what makes a good agent.
- Everything else in this talk unfolds from that loop.


## 9. Change the Harness Demo

**Backdrop:** Asciinema animation from pi.dev.

Show the Pi demo from pi.dev: change the harness, not your workflow. The point is that the agent can customize its own tools and interaction surface, then you reload and keep working.

## 10. Part I — Agent Psychosis

**Backdrop:** Part I · Agent Psychosis

Transition into the human and organizational effects.

## 11. Pi Is Built in the Open

**Backdrop:** Built in the Open

Concrete example from Pi: because it is developed in the open, we see agent-generated slop arrive as PRs. Mention the biggest PRs by churn and commits; do not frame this as bad intent. Frame it as speed without context and review capacity.

- Pi is an agent, developed publicly on GitHub.
- That means we see the new contribution pattern in the raw — and it is horrifying.
- #2973 “Add pid …”: 671k lines of slop, 3,632 files, 450 commits.
- #1284 “migrate to Vercel AI SDK”: 80k lines of slop over 423 files.
- #1923: 70k lines added, 167 files, 58 commits.


## 12. Pi PR Screenshot I

**Backdrop:** Screenshot of generated PR churn.

Show the first screenshot as a concrete example of generated churn arriving in the open. Let the size and shape of the PR speak before explaining it.

## 13. Pi PR Screenshot II

**Backdrop:** Second screenshot of generated PR churn.

Show the second screenshot as another example of speed without local context. Use it to transition from raw volume into the psychology of output feeling like progress.

## 14. Output Feels Like Progress

**Backdrop:** Output Is Not Understanding

This is the psychological trap: output has become cheaper than understanding.

> Agents produce output fast, and output feels like progress.

- Your brain rewards velocity.
- The organization starts expecting velocity.
- More code is not the same as more understanding.
- The agent does not know when to stop; neither do you once you are in the flow.

## 15. Expectations Changed Fast

**Backdrop:** Expectations Move Overnight

Make this practical: the first visible change is often organizational pressure and changed contributor behavior.

- The baseline expectation moves from “can we build it?” to “why is it not built yet?”
- Product, support, sales, and founders can now arrive with working prototypes.
- That is genuinely empowering.
- It also turns engineering review into a painful bottleneck.

## 16. The New Code Contributors

**Backdrop:** New Contributors, New Gaps

Two risks: non-engineers can now produce code without seeing the gap to good engineering, and juniors can feel senior leverage before developing senior judgment. Also call out the clanker-as-argument-generator pattern: it gives world knowledge, not necessarily the local context behind a senior review.

- More people can now produce working code.
- Non-engineers may not see the gap between “it runs” and “an engineer would own this.”
- Juniors can feel senior-level leverage before they build senior-level judgment.
- The clanker can produce arguments against a review, but not the institutional context behind it.

## 17. Atrophy Is Real

**Backdrop:** Skills Atrophy Quietly

The muscle atrophy point: design, debugging, and review must remain active practices.

- If the agent always explains the code, your own understanding fades.
- If review becomes rubber-stamping, the codebase starts drifting.

## 18. The Review Asymmetry

**Backdrop:** Generation Is Cheap. Review Isn’t.

A generated change can be cheap to produce and expensive to review. This is the maintainer burden.

- A change can take minutes to generate and hours to understand.
- Review capacity does not scale with generation capacity.
- Large generated PRs create social pressure, not just tooling work.
- Ask for small changes, clear intent, and the context that led to the code.

## 19. Psychology Insight

**Backdrop:** Humans Must Keep Thinking

Land the section in one crisp sentence.

- The danger is not that agents write code.
- The danger is that humans stop thinking.

## 20. Part II — Code Is All You Need

**Backdrop:** Part II · Code Is All You Need

Transition from psychology into the architecture of agents.

## 21. Code Is the Glue

**Backdrop:** Code Is the Glue

This is the key conceptual bridge: code is not only the output of coding agents, it is how custom agents do work.

- Agents do not only generate product code.
- They write throwaway code to parse, fetch, inspect, transform, and validate.
- They use scripts to drive browsers, debuggers, CLIs, APIs, and documents.
- When you build an agent, you often wire together code execution, files, tools, and policy.

## 22. Why Code Wins

**Backdrop:** Determinism Beats Inference

Explain why code often beats many tool definitions or MCP-style interfaces for repeatable work.

- You can inspect the approach instead of trusting each inference step.
- You can rerun the script without another model call.
- You can compose it with files, pipes, tests, logs, and existing tools.
- Once written, most of the work becomes deterministic.

## 23. Tiny Programmable Worlds

**Backdrop:** Tiny Programmable Worlds

The practical pattern: give the agent a small world where it can act safely and learn from failures.

- Text files in, artifacts out.
- Fast commands, deterministic outputs, useful errors.
- Logs the agent can read without asking a human.
- Enough constraints that failure is visible instead of dangerous.

## 24. Gondolin

**Backdrop:** Gondolin: Disposable Worlds

Pitch Gondolin as the concrete sandbox we built for this style of agent architecture.

- https://github.com/earendil-works/gondolin
- Local disposable Linux micro-VMs for agent turns and tasks.
- Programmable filesystem mounts controlled from JavaScript.
- Programmable HTTP/TLS egress policy and allowlists.
- Secret injection through placeholders so the guest does not see the real secret.
- Fast enough to treat the VM as something you create, use, and throw away.


## 25. Gondolin Demo

**Backdrop:** Gondolin asciinema animation.

Show the Gondolin asciinema demo. Use it as the concrete visual for disposable programmable worlds: create the sandbox, run work inside it, and throw it away.

## 26. An Agent-Legible Codebase

**Backdrop:** Codebase Is Your Infrastructure

Bring the codebase design lessons back in. These are also good human engineering practices.

- Clear module boundaries: agents can work in one place without corrupting another.
- Known patterns and conventions: agents pattern-match; give them patterns worth matching.
- Greppable names and boring imports.
- Fast tests and loud failures.
- No hidden magic: if the agent cannot see it, it cannot respect it.

## 27. Part III — Force Friction

**Backdrop:** Part III · Force Friction

Transition to the operating discipline required to make this sustainable.

## 28. Where Speed Actually Helps

**Backdrop:** Speed Kills

Separate high-leverage speed from places where speed creates future cleanup cost.

**High leverage**

- Exploring product directions.
- Prototypes and onboarding experiments.
- Debugging concrete failures.
- Fixing CI and regressions.
- Creating reproduction cases.

**Lower leverage**

- Reliability and shared understanding.
- Long-lived systems with many states.
- Code you have not specified clearly yourself.
- Anything where cleanup cost arrives later.

## 29. Mechanical Enforcement Beats Prompts

**Backdrop:** Add Mechanical Guardrails

Mechanical enforcement beats hoping the prompt is obeyed.

- No bare catch-alls: force explicit error handling.
- No new dependencies without a callout.
- No raw access outside the agreed boundary.
- Use component libraries and code generation where they preserve consistency.
- Let tools reject the easy wrong answer before a human has to see it.

## 30. Pull Request Review

**Backdrop:** Machines Fix. Humans Judge.

Split review into what the machine should fix and what the human must judge.

**Immediately actionable → Agent**

- Style violations.
- Mechanical bugs.
- Clear engineering rule breaks.
- Missing tests for explicit behavior.

**Call-outs → Human**

- Database migrations added.
- New dependencies introduced.
- Auth / permissions changes.
- Backwards-incompatible API changes.
- Irreversible destructive operations.

## 31. Force Friction

**Backdrop:** Remove Toil. Add Judgment.

Define the final lesson: remove toil, add friction around judgment.

- Remove mechanical friction: formatting, boilerplate, setup, obvious fixes.
- Add judgment friction: taste, architecture, security, data, trust.
- Keep generated changes small enough to understand.
- Make the human feel the pressure where responsibility actually lives.

## 32. Final

**Backdrop:** Without Friction You Can't Steer

Close with the friction thesis and thank the audience.

- Some friction is waste.
- Without friction, you cannot steer.
- The friction is your judgment.

## 33. Q&A

**Backdrop:** Q&A

Q&A.

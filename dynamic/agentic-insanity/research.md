# Agentic Insanity: research notes

Background for the talk, for further exploration. This is the material behind slides 3 to 10,
plus what did not fit. Researched on 6 November 2026 from `~/Development/lucumr` (the blog),
the GitHub contribution API, and the 119 git repositories in `~/Development`.

The talk's thesis: two years ago I believed AI would help around the edges of software
engineering but not change its core. Today I basically do not write programming code anymore,
and I ship more than ever, even though my job moved away from engineering in the same period.

---

## 1. The arc, post by post

All dates from the filenames in `blog/posts/`. URLs are `https://lucumr.pocoo.org/YYYY/M/D/slug/`.

### Before: worry, not usefulness (2023 to 2024)

- **2023-02-17, "I Think AI Would Kill my Wife"** (`2023/02-17-the-killing-ai.md`). The only
  AI post of 2023. About ChatGPT/Bing with tool access and the risks of hooking it up to actions.
  Later I referred back to it: "just two years ago I was convinced AI might kill my wife".
- **2023-03-20, "Lessons from a Pessimist"** mentions AI in passing: people are uncomfortable and
  downplay "the status-quo capabilities of AI".
- **2024: 20 posts, none tagged `ai`.** Rye, uv, MiniJinja, licensing, FSL, Austria, async.
  The only mention is in "Reflecting on Life" (2024-12-26): "Even if the world around you
  shifts — like the rise of AI in software engineering — your experience and expertise aren't
  wasted." That framing (AI as something that happens *to* the profession) is the baseline.

### January 2025: the intern

- **2025-01-30, "How I Use AI: Meet My Promptly Hired Model Intern."** Key lines:
  - "I treat AI as I would a collaborator or a pretty good intern but I remain responsible for
    the final outcome."
  - Toolkit: Open WebUI, Simon's `llm`, Ollama on an M1 Max, **Cursor** ("my go-to for
    programming with AI assistance"), ChatGPT Plus (voice mode).
  - Programming uses: debugging and summarizing, fuzzy parsing, code generation, "particularly
    for prototyping it's amazing".
  - "I find it performs exceptionally well at Python, somewhat okay at JavaScript and horrible
    at Rust." Workaround: iterate in Python, then translate to Rust.
  - Already notes Bluesky's "almost religious resistance to AI".
  - Quote for a possible slide: "My approach isn't about outsourcing thinking, but augmenting it."
- Same month, "Build It Yourself" (dependencies) and later "Ugly Code" are still classic
  hand-written engineering posts.

### March 2025: leaving Sentry

- **2025-03-31, "I'm Leaving Sentry."** After ten years. Not AI-related on its face, but it is
  the role change the velocity data has to be read against.

### May to June 2025: the flip

- **2025-06-04, "AI Changes Everything."** The pivotal post.
  - "Where I used to spend most of my time in Cursor, I now mostly use Claude Code, almost
    entirely hands-off."
  - "Do I program any faster? Not really. But it feels like I've gained 30% more time in my day
    because the machine is doing the work."
  - "If you would have told me even just six months ago that I'd prefer being an engineering
    lead to a virtual programmer intern over hitting the keys myself, I would not have believed
    it."
  - "It took me a while to even warm up to tool usage by AI in the first place."
  - "Even as I'm writing this blog post, Claude is doing some refactorings."
- **2025-06-10, "GenAI Criticism and Moral Quandaries"** (reply to Glyph).
  - "That hasn't always been my stance, and I intend to remain critical."
  - "Now I admit that I do a lot more code review than I do programming at the moment."
  - "So is programming still enjoyable if I don't hit the keys? For me, yes. I still write code,
    just less of it." (Good contrast for slide 10: by late 2026, not even "less of it".)
  - Sentry anecdote: adoption was bottom-up, discovered through IC expense reports for AI tools.
- **2025-06-12, "Agentic Coding Recommendations."** Claude Code, $100 Max plan, Sonnet only,
  `claude --dangerously-skip-permissions` aliased to `claude-yolo`. Recommends Go for new
  backends. "I expect this blog post to age very poorly." (It did.)
- **2025-06-17, "We Can Just Measure Things."** 24-hour VibeTunnel hackathon with Peter and
  friends. Agents make bad tooling painful in a measurable way.
- **2025-06-21, "My First Open Source AI Generated Library."** `sloppy-xml-py`: one-shotted by
  Claude, then ~20 prompts. Claude also set up CI and configured the PyPI trusted publisher by
  driving the browser.
- **2025-12-22, "A Year of Vibes"** dates the start: "a growing obsession with Claude Code in
  April or May". Also: Peter "got me hooked on Claude early in the year".

### Summer 2025: tools, MCP, code as the interface

- **2025-07-03, "Tools: Code Is All You Need"** and **2025-08-18, "Your MCP Doesn't Need 30
  Tools: It Needs Code."** The thread that leads to Pi's codemode (2026-10-06) and to djs.
- **2025-07-30, "Agentic Coding Things That Didn't Work."** Rule: automate only what you do
  regularly, delete automations you stop using. "Keeping The Brain On": "it encourages mental
  disengagement… I tend to overestimate the agent's capabilities with time."
- **2025-08-04, "In Support Of Shitty Types."**

### September 2025: 90%

- **2025-09-29, "90%."** Opens with Dario Amodei's March 2025 prediction (90% in 3 to 6
  months, essentially all code in 12).
  - The infrastructure component at the new company (matches the `earendil-works/mailhook`
    repo: 258 of my commits in Q3 2025): Go, OpenAPI-first, raw SQL, Pulumi, custom SDK
    generator for Python and TypeScript, about 40,000 lines. "North of 90% AI-written code."
  - "I still treat every line as my responsibility, judged as if I wrote it myself."
  - Claude Code plus Codex; Codex for review after PRs.
  - Failures: a rate limiter without jitter, swallowed errors, love of outdated dependencies,
    no real grasp of threading or goroutines.
  - Wins: research and code together, three OpenAPI approaches in a day, cheap refactoring,
    AWS/Pulumi "a few days instead of weeks", testcontainers migration in an hour.

### Autumn 2025: building agents at Earendil

- **2025-10-17, "Building an Agent That Leverages Throwaway Code"** (Pyodide, file systems,
  durable execution).
- **2025-11-03, "Absurd Workflows"** (durable execution in Postgres), **2025-11-21, "Agent
  Design Is Still Hard"**, **2025-11-22, "LLM APIs are a Synchronization Problem"**,
  **2025-12-13 Skills vs MCP**, **2025-12-17 Plan Mode**.
- **2025-12-22, "A Year Of Vibes."**
  - "it was also the year I stopped programming the way I did before."
  - 36 posts in 2025 (my count from the repo: 34 files, 20 tagged `ai`).
  - Tools by December: Amp, Claude Code and Pi, all in the terminal. "Amp feels like the Apple or
    Porsche of agentic coding tools, Claude Code is the affordable Volkswagen, and Pi is the
    Hacker's Open Source choice for me."
  - Parasocial bonds with tools: "I have tried to train myself for two years, to think of these
    models as mere token tumblers, but that reductive view does not work for me any longer."
  - Wishes: new version control (keep failed paths), new review, new observability.
  - "what I haven't managed this year is to give in to the machine. I still treat it like regular
    software engineering and review a lot."
- **2025-12-23, "Advent of Slop"**: a guest post written by Claude after solving Advent of
  Code 2025 on its own.

### January to April 2026: Pi, porting, the bottleneck

- **2026-01-14, "Porting MiniJinja to Go With an Agent."** "In total I probably spent around 45
  minutes actively with it. It worked for around 3 hours while I was watching, then another 7
  hours alone." All prompting by voice in Pi, Opus 4.5 then GPT-5.2 Codex. Validated with the
  existing insta snapshot tests, parsed from Go, plus a skip list. PR #854, session transcript
  and narrated video linked in the post.
- **2026-01-18, "Agent Psychosis: Are We Going Insane?"** This post is close to the talk
  title. Gas Town, dæmons, addiction, "I too have thrown some vibeslop up" to other people's
  repos. **Worth rereading in full before writing the talk's closing.**
- **2026-01-31, "Pi: The Minimal Agent Within OpenClaw."** "Pi happens to be, at this point, the
  coding agent that I use almost exclusively." "none of this was written by me, it was created
  by the agent to my specifications." Skills are "hand-crafted by my clanker".
- **2026-02-09, "A Language For Agents."**
- **2026-02-13, "The Final Bottleneck."** "Historically, writing code was slower than reviewing
  code." OpenClaw at 2,500+ open PRs. Textile industry: removing one bottleneck moves it
  downstream. Closing: "Two years ago, I too was the bottleneck. I was the bottleneck all along."
- **2026-03-05, "AI And The Ship of Theseus"** (chardet's AI reimplementation and relicensing).
- **2026-03-20, "Some Things Just Take Time."** "everybody who is like me, fully onboarded into
  AI and agentic tools, seemingly has less and less time available". Good counterweight to the
  velocity slide: output went up, free time did not.
- **2026-04-08, "Mario and Earendil."** Pi joins Earendil.
- **2026-04-11, "The Center Has a Bias"**: a measured position on AI tends towards trying it.

### May to July 2026: Pi with Pi, loops, regressions

- **2026-05-24, "Building Pi With Pi."** The tracker numbers used on slide 8. Over the last 90
  days, excluding Earendil members: 3,145 external issues and PRs, 2,504 auto-closed, 17%
  reopened (26% if issues fixed by referencing commits count), 60 of 714 auto-closed PRs merged
  (about 8%). "5% human and 95% clanker-generated." The `/is` and `/wr` prompts. "Almost always,
  the correct fix is not to handle the bad state, but to make the bad state impossible."
- **2026-05-26, "Clanker: A Word For The Machine."**
- **2026-06-23, "The Coming Loop."** Boris Cherny quote ("My job is to write loops").
  - "My current status is that I have not had much success with this way of working for code I
    deeply care about which turns out to be quite a lot of code."
  - Loops work for porting (Bun Zig to Rust, MiniJinja), performance exploration, security
    scanning, research: code that is transformed or not meant to last.
  - "Software as organism" instead of software as a deterministic machine.
  - "You cannot quite opt out": attackers and reporters loop, so defenders will too (curl's
    "summer of bliss").
  - "And yet I have no doubts that this looping future is going to be our future despite the
    fact that I presently resent it."
- **2026-07-04, "Better Models: Worse Tools."** Opus 4.8 and Sonnet 5 invent fields in Pi's
  `edits[]`; older models do not.
- **2026-07-13, "The Tower Keeps Rising"** (vibecoding and a shared language).

### August to November 2026: factories and doubt

- **2026-08-22, "Fast and Hard Code."** Language choice matters less; people pick "hard
  languages" (Rust, Zig) because agents optimize well.
- **2026-08-24, "Anger, Anxiety and Agency."**
- **2026-09-05, "Latent Powers"** (CarPlay dongle hacking with Fable and Sol via Pi).
- **2026-09-07, "Astra for Coding: Why Are We Doing This Again?"** The weekend software factory
  (Python with virtual threads and lexical scoping on CPython): 35 hours, net 75k lines, 79
  commits, about 1,400 messages between agents, about $1,200 raw API cost, "absolutely nothing
  of value". Task names drifting to "8b2c2b3". Code-golfed Python tool calls leaking into
  committed code. "Involution" as the frame.
  - **Inconsistency to check before quoting:** the post says "around 4 billion tokens" (a full
    reset's worth of ChatGPT tokens) early on, then "around 1B tokens" later. The slide only
    says "$1,200 of tokens".
- **2026-10-06, "What is Codemode."** Pi 1.0 adds MCP via codemode. djs exists to replace
  QuickJS in exactly this.
- **2026-11-05 (in the repo, untagged): "Research notes: the futures that did not happen."**
  A research file, not a post. Possible source for a "maybe this is a fad" counterpoint slide.

### Where the arc goes in November 2026

- `earendil-works/djs`, started 2026-11-01 01:13: a coordinator agent and sub-agents with
  worktrees, a merge lock and a gate, a board (`work/BOARD.md`), issue files, a decision log,
  `ARCH.md`, a QuickJS fork (`dquickts`) as read-only oracle, test262. `work/COORDINATOR.md` is
  a checklist "learned the hard way".
- So in two months I went from "why are we doing this again?" to running a factory myself.
  That reversal is the "insanity" and should be addressed head-on: what is different about djs
  (an oracle, a spec, a frozen architecture), and is it actually different or am I just
  rationalizing?

---

## 2. Velocity data

### GitHub contribution API (user `mitsuhiko`)

GraphQL `contributionsCollection` per calendar year. `restricted` are private contributions
the API does not itemize (Sentry's and Earendil's private repositories).

| Year | Commits | Restricted | PRs | PR reviews | Issues | Repos with commits | Total |
|------|--------:|-----------:|----:|-----------:|-------:|-------------------:|------:|
| 2021 | 766 | 63 | 151 | 109 | 38 | 52 | 1,158 |
| 2022 | 1,023 | 374 | 202 | 103 | 98 | 48 | 1,818 |
| 2023 | 1,143 | 1,966 | 276 | 184 | 101 | 54 | 3,727 |
| 2024 | 869 | 1,823 | 224 | 86 | 59 | 34 | 3,089 |
| 2025 | 1,179 | 2,789 | 134 | 9 | 83 | 50 | 4,233 |
| 2026* | 6,885 | 3,898 | 183 | 27 | 37 | 60 | 11,054 |

\* up to 6 November 2026.

Monthly public commits / total contributions (2024 to 2026):

```
2024-01  67 / 380    2025-01  88 / 250    2026-01   530 / 1012
2024-02 214 / 519    2025-02  80 / 262    2026-02   349 / 601
2024-03 201 / 443    2025-03  74 / 311    2026-03   284 / 694
2024-04  92 / 352    2025-04  24 / 184    2026-04   280 / 623
2024-05  33 / 251    2025-05  15 / 83     2026-05   170 / 565
2024-06  26 / 192    2025-06 264 / 613    2026-06   197 / 557
2024-07  44 / 220    2025-07 126 / 299    2026-07   188 / 806
2024-08  66 / 183    2025-08  64 / 297    2026-08   521 / 991
2024-09  37 / 150    2025-09  10 / 471    2026-09   645 / 1132
2024-10  41 / 172    2025-10 183 / 578    2026-10  2555 / 2957
2024-11  45 / 145    2025-11  77 / 373    2026-11  2652 / 2746 (6 days)
2024-12  30 / 186    2025-12 212 / 681
```

Observations:

- May 2025 is the lowest month of the whole period (15 public commits, 83 total): the gap
  between leaving Sentry and Claude Code clicking. June 2025 jumps to 264 / 613.
- **Correction:** the monthly queries overlap by one day (GitHub counts the `to` day
  inclusively), so everything committed on November 1 shows up in both October and November.
  That is all of djs's first day (1,076 commits) and all of lineread (282). The real split:
  djs has 2,278 commits in total, all in November; lineread has 284, all on November 1.
  October without those is about 1,200 public commits, mostly dungeon-crawler (660). The yearly
  totals and the quarterly chart on the velocity slide are not affected.
- **PR reviews collapse: 184 (2023) → 86 → 9 (2025) → 27.** Partly because of leaving Sentry
  (fewer human colleagues' PRs), partly because review moved local, between me and agents ("A
  Year of Vibes": Codex reviews on the command line are "invisible to other engineers on the
  team"). Possible slide: *who* I review changed.
- PRs opened drop from 276 (2023) to 134 (2025): agents commit directly to my own repos, PRs
  are for other people's repos.

Top public repos by my commits:

- 2024: astral-sh/rye 347, minijinja 283, lucumr 74, insta 37.
- 2025: lucumr 209, earendil-works/absurd 166, minijinja 143, amantus-ai/vibetunnel 134,
  gh-issue-sync 70, argument 47, earendil-works/website 47, fstrings-wtf 35, vibe-throwback-chat
  30, sloppy-xml-py 28.
- 2026 Jan to Sep: earendil-works/pi 769, deser 418, earendil-works/gondolin 352,
  agent-stuff 231, tankgame 198, minijinja 191, earendil-works/inkling 170, absurd 120.
- 2026 Oct to Nov 6 (deduplicated): earendil-works/djs 2,278, dungeon-crawler 660, lineread
  284, pi about 170, terrarium 116, deser 111, minijinja 79.

### Local repositories (the chart on slide 7)

Method: for each of the 119 git repos in `~/Development`, `git log --all --no-merges
--author='Armin Ronacher' --author='mitsuhiko' --since=2023-01-01 --numstat`, then deduplicate
by commit hash (several repos are clones of each other: `elwing`/`elwing-alt`,
`pi-mono`/`pi-private`/`pi-for-ci`). Lines exclude lockfiles, snapshots, JSON, SVG, HTML,
vendored, generated and fixture paths.

| Quarter | Commits | Repos | Lines added | Added per commit |
|---------|--------:|------:|------------:|-----------------:|
| 2023Q1 | 220 | 6 | 8,790 | 39 |
| 2023Q2 | 158 | 7 | 7,950 | 50 |
| 2023Q3 | 86 | 8 | 4,012 | 46 |
| 2023Q4 | 56 | 5 | 6,087 | 108 |
| 2024Q1 | 101 | 6 | 9,617 | 95 |
| 2024Q2 | 121 | 5 | 8,688 | 71 |
| 2024Q3 | 99 | 9 | 4,741 | 47 |
| 2024Q4 | 111 | 3 | 5,079 | 45 |
| 2025Q1 | 211 | 9 | 13,700 | 64 |
| 2025Q2 | 142 | 3 | 24,897 | 175 |
| 2025Q3 | 410 | 7 | 80,415 | 196 |
| 2025Q4 | 816 | 11 | 174,054 | 213 |
| 2026Q1 | 1,677 | 27 | 863,407 | 514 |
| 2026Q2 | 1,203 | 37 | 282,911 | 235 |
| 2026Q3 | 2,303 | 46 | 1,058,871 | 459 |
| 2026Q4* | 4,344 | 35 | 1,406,921 | 323 |

\* 1 October to 6 November.

**Caveats (important before presenting):**

- **No Sentry repositories are cloned locally**, so 2024 and early 2025 are understated: that
  work only shows up as the ~1,800 restricted contributions per year in the GitHub table. This is
  why slide 7 leads with GitHub's own count (3.6×, private work included) and only shows the
  local chart with a source line. If someone pushes back, 3.6× is the defensible number. The
  21× is real but compares open source in 2024 to open source plus Earendil in 2026.
- Lines added are not shown on slides: inflated by ports and generated code. Examples:
  `elwing` Q1 2026 added ~441k lines, ~347k of them in `packages/bash` (a bash implementation);
  `deser` Q3 2026 ~310k; `cpython` Q3 2026 ~95k (the Astra factory).
- Commits are not value. Agents commit more often and in smaller pieces (djs commits a board
  update, then the change, then "done").
- Whose commits are these? Everything is authored as me, so "my commits" includes agent
  commits. That is the point of the talk, but say it explicitly.

To reproduce, the scripts I used were `/tmp/velocity.sh` and the dedup pass (inline in the
session). Worth turning into `research/velocity.sh` in this folder if the numbers need to be
refreshed before the talk.

### djs (slide 9)

- Created 2026-11-01 01:13 (local time); 2,278 commits by 2026-11-06 09:30.
- Commits per day: Nov 1: 1,076 · Nov 2: 114 · Nov 3: 278 · Nov 4: 312 · Nov 5: 425 · Nov 6
  (morning): 73.
- Commits by hour (local time): 00:148 01:187 02:162 03:112 04:74 05:54 06:33 07:32 08:99
  09:89 10:97 11:92 12:76 13:84 14:80 15:99 16:65 17:98 18:103 19:66 20:76 21:105 22:96
  23:151. The peak is 1 am.
- 178,483 lines in tracked `.rs` files; 3,288 tracked files; 237 issue files in
  `work/issues/`; 167 `board:` commits.
- README: passes 38,069 of 38,109 test262 tests in its active group; wasm module 350 KB
  brotli-compressed; replaces QuickJS in Pi's codemode.
- Process files worth showing in a demo: `AGENTS.md`, `ARCH.md`, `TESTING.md`,
  `docs/decisions.md`, `work/README.md`, `work/COORDINATOR.md`, `work/BOARD.md`.

### Blog volume

| Year | Posts | Tagged `ai` |
|------|------:|------------:|
| 2023 | 9 | 1 |
| 2024 | 20 | 0 |
| 2025 | 34 | 20 |
| 2026 | 34 (+1 research file) | 30 |

---

## 3. Role context

- 2015 to March 2025: Sentry, ten years.
- 2025: start Earendil (PBC) with Colin, in Vienna. CTO.
- April 2026: Mario joins Earendil with Pi. From then on, part of my time is Pi's community,
  tracker and roadmap.
- So the talk's claim is: less of my time is engineering, but output went up. To support the
  first half, I might want something concrete besides the title: calendar hours, number of
  people at Earendil, hiring, or the share of my blog that is about companies, open source and
  Europe rather than code.

---

## 4. Ideas that did not make the eight slides

- **The tool timeline as a slide:** Cursor (Jan 2025) → Claude Code, Sonnet only, yolo mode
  (Jun 2025) → Claude Code + Codex for review (Sep 2025) → Amp, Claude Code, Pi (Dec 2025) → Pi
  almost exclusively, by voice (Jan 2026) → loops and harnesses (mid 2026) → coordinator and
  sub-agents (Nov 2026).
- **Models as a timeline:** Sonnet 3.5/4 → Opus 4.5 and GPT-5.2 Codex (Jan 2026) → Opus 4.8,
  Sonnet 5, Fable, GPT-6 Sol, GPT-6 Astra (mid to late 2026). Newer is not always better at
  tools ("Better Models: Worse Tools").
- **What I gave up, honestly:** "I still write code, just less of it" (Jun 2025) → "none of this
  was written by me" (Jan 2026) → djs. Find the moment where it went to zero. Possibly
  Dec 2025 / Jan 2026 with Pi and voice prompting.
- **Free time did not go up** ("Some Things Just Take Time"): any time saved "gets immediately
  captured by competition". Pairs with the djs hour chart.
- **Addiction and psychosis** ("Agent Psychosis", Jan 2026). The title "Agentic Insanity" almost
  demands a reference. Also "A Year of Vibes" on parasocial bonds.
- **"Clanker" vs "agent"**: agency stays with humans. Could be a small aside on slide 10.
- **The counterpoint:** the "futures that did not happen" research notes (Nov 2026). Is agentic
  engineering the Perceptron (late but real) or the Fifth Generation project?
- **Open source under pressure**: Pi auto-closes PRs from new contributors; curl; Codeberg's
  rule; "slop begets slop".
- **Language choice:** Go recommended in Jun 2025, then Rust everywhere in 2026 (deser, djs,
  lineread). Agents made "hard" languages cheap ("Fast and Hard Code").
- **Disposable vs. committed code** as the line where loops work and where they don't (Coming
  Loop, Astra). djs might be the first committed-code loop that works for me. Why?

## 5. Open questions to settle before the talk

1. When exactly did I stop writing code by hand entirely? The blog never says it outright.
   Closest: "none of this was written by me" (Pi post, Jan 2026). Do I want to make that claim
   on stage with a date?
2. Is djs good code, by the standard of "Astra: Why Are We Doing This Again?" If I put it on a
   slide as the counterexample, I should have read enough of it to defend it.
3. Is the "6 days" framing fair? Partly answered: the first commit (Nov 1, 01:13) already
   contains 1,391 lines of process and planning (ARCH.md, decisions.md, BOARD.md, the gate and
   merge scripts, seven issue files). The oracle, `~/Development/dquickts`, is a QuickJS fork I
   was still committing to until Oct 30 ("released 0.2.0"). So: six days of building, after
   some days of preparing the spec and the oracle. Saying that on stage makes the point
   stronger, not weaker: the preparation is the part I still do.
4. The Astra token count discrepancy (4B vs 1B).
5. Do I want the commit chart at all, given the Sentry gap? Alternative: only the GitHub totals
   table (3,089 → 4,233 → 11,054) plus the djs hour chart.
6. Maybe check what share of 2026 commits were made while I was in meetings or asleep: the djs
   hour distribution suggests the answer is "most".

---

## 6. "What this means" slides (19 to 23): sources

Researched 6 November 2026 with web search. Numbers as reported by the sources; check
again before the talk.

### Copying got cheap (slide 19)

- **PhotoCraft / ArtCraft** (announced around Sep 30 to Oct 1, 2026): a clean-room Photoshop
  reimplementation in Rust, one developer with Claude Opus 5.5 agents (about 8 in parallel).
  Clones of Word, Excel, PowerPoint, Premiere, Acrobat followed "within 10 days".
  **Not decompiled:** project rules say Photoshop is studied only for behavior and
  appearance; built from Adobe's public PSD spec, ICC standards and observation. The team
  inventoried the installed package without launching it (shortcuts, plug-ins, strings from
  the main binary). 250+ PSD files rendered by the real Photoshop act as a pixel oracle.
  Self-rated about 45% "ready for real work". 19.4K stars in 8 days, 55,400 by Oct 13;
  2,429 commits in 16 days from 312 contributors. Adobe's ToS (since Oct 2025) forbids
  monitoring inputs/outputs "in order to recreate that system", which the oracle generation
  arguably does. Adobe stock moved -0.78% when HSBC cited the clones.
  - https://redreamality.com/blog/ai-reverse-engineering-clean-room-rewrite-licensing
  - https://flowtivity.ai/blog/adobe-rust-cleanroom-clones
  - https://goldthesis.com/videos/software-clones/
  - https://github.com/storytold/photocraft
- **REA ("Reverse-Engineer Anything")**: reverse-engineering toolkit for coding agents; gained
  45,327 stars on Oct 13, 2026. This is the "from a binary" part: agents inspecting DLLs and
  running programs instead of guessing. https://rea.tools/
- **Bun, Zig to Rust** (PR oven-sh/bun#30412, merged 2026-05-14; blog 2026-07-08): 535,496
  lines of Zig, porting guide plus mechanical file-by-file port plus loops; at peak about
  1,300 lines a minute; failing test files from 972 to 23 in two days of CI; zero tests
  skipped or deleted; memory after 2,000 builds 6,745 MB to 609 MB. Disclosure: Bun is owned
  by Anthropic; written with a pre-release Claude Fable 5. https://bun.com/blog/bun-in-rust
- **Anthropic merges**: about 2,500 changes merged per day in May 2026, over 30,000 in
  September. https://www.anthropic.com/engineering/redesigning-source-control

### Checking without reading (slide 20)

- **Martin Kleppmann, Dec 8, 2025**: "AI will make formal verification go mainstream":
  proofs are about to become vastly cheaper; the limit will be culture, not technology.
  https://martin.kleppmann.com/2025/12/08/ai-formal-verification.html
- **Anthropic, Oct 22, 2026** (Carlini, Agrawal, Gross): over a few weeks Claude patched the
  bugs it found and proved no crashes on any input up to 64 MB for 239 entry points across
  123 OSS-Fuzz libraries, on compiled RISC-V binaries; found bugs that survived trillions of
  fuzz runs. seL4 comparison: two person-years to implement, twenty to verify. Caveat they
  state: "formally verified" does not mean bug-free (only relative to the spec).
  https://www.anthropic.com/research/formal-verification
- **Hermetic builds and supply chain**: Shai-Hulud (Nov 2025) and its 2026 waves (Miasma in
  June, a keyv-related wave in August; "ChainDrop"/Mini Shai-Hulud across 400+ packages):
  over 1,300 npm package versions compromised, about 2 billion monthly downloads, through
  install-time lifecycle scripts.
  - https://www.csa.gov.sg/alerts-and-advisories/advisories/ad-2026-009
  - https://research.jfrog.com/post/shai-hulud-is-back-august/
  - https://www.microsoft.com/en-us/security/blog/2026/08/04/chaindrop-supply-chain-compromise-anatomy-self-propagating-worm
  - Flox on hermetic builds as mitigation: http://flox.dev/blog/mitigating-shai-hulud-attacks-with-hermetic-builds
  - Academic angle: "Grounded Scaling: Why Agentic AI Needs Deterministic Environments"
    (Alibaba, arXiv 2606.22495).
- **Version control**: Anthropic built Scion and moved its monorepo off git in five months
  while daily merges grew 10×. "A proper merge queue, for example, doesn't make much sense at
  agent scale." They replaced the global merge-queue lock with post-merge and pre-deploy
  testing. Other agent-era VCS efforts: Vex (vex.sc), git-agentic/src-control, GitButler,
  Jujutsu. My own wish list is in "A Year of Vibes" (Dec 2025).

### Changing languages (slide 21)

- Bun (above); MiniJinja Rust to Go (Jan 2026, my post).
- **chardet 7.0.0** (Mar 4, 2026): ground-up rewrite by the maintainer with Claude Code in about
  five days from the API and tests, relicensed LGPL to MIT (later 0BSD, PR #349). Mark Pilgrim
  objected ("No right to relicense this project", issue #327). A sub-agent read the original
  `universaldetector.py` mid-rewrite, which undermines the clean-room claim. My post: "AI And
  The Ship of Theseus" (Mar 2026).
- **lineread** (`~/Development/lineread`, github.com/mitsuhiko/lineread): GNU Readline 8.3
  reimplemented in Rust, MIT/Apache 2.0 instead of GPL ("Like readline but not copyleft").
  - Timeline from git (all local time, one evening): first commit Nov 1 16:28 ("Add plan and
    agent rules"), last Nov 2 00:03. **About 7.5 hours, 284 commits.**
    - 16:28 to 20:13: plan, recreated public headers, a C test driver, a Python runner with a
      pty and terminal emulator, a header/ABI conformance tier, Docker for Linux, then the
      behavioral test suite, written by two sub-agents in parallel and recorded against the
      real GNU Readline.
    - Then the clean-room cut: readline source deleted, only compiled binaries kept as a
      black-box oracle (`../lineread-ref-bin/`). Allowed sources: man pages, info manuals,
      the recreated headers, the tests.
    - 20:13 to 23:21: the Rust implementation, 171 commits touching `impl/`.
    - 23:21 to 00:03: launcher (LD_PRELOAD / DYLD_LIBRARY_PATH), README, licenses.
  - Size: about 18,400 lines of Rust; 268 test files.
  - **Score, run today (Nov 6):** `SCORE 99.972 cases=4766/4772 fields=66607/66632` on macOS
    (8 seconds). The `99.990 ... 4402/4404` line in docs/TESTING.md is from before the
    implementation existed and should not be quoted.
  - There is a smoke tier that builds and drives CPython's `readline` module, the SQLite
    shell and the Lua REPL against lineread.
  - The README carries an explicit disclaimer: an attempted clean room, not a verified or
    legal one, and the agents' training data was not checked. Say that on stage, next to
    the chardet story.
  - Hour histogram of commits: 16h 2 · 17h 41 · 18h 32 · 19h 13 · 20h 29 · 21h 97 · 22h 54 ·
    23h 14 · 00h 1.
- Not used on the slide, but relevant: **TypeScript 7.0** shipped its Go-native compiler on
  2026-07-08 (10× faster builds). That port started in March 2025 and was not
  primarily agent-written, so it shows the payoff of switching languages, not the new cost.
- The chardet row on the slide is a license move, not a language move. Keep it or swap it.

### Own runtimes (slide 22)

- djs (this research file, section 2).
- **Anthropic, Feb 5, 2026** (Carlini): 16 parallel agents wrote a Rust C compiler from
  scratch; nearly 2,000 Claude Code sessions, about $20,000 API cost, 100,000 lines, builds
  Linux 6.9. https://www.anthropic.com/engineering/building-c-compiler
- **Basis Research, Apr 16, 2026**, "Building an Unverified Compiler with Agents": a JS spec
  agent wrote 59,573 lines of formalised semantics with zero `sorry`s; the compiler emitted
  WebAssembly passing a small subset of test262. https://www.basis.ai/blog/verified-compiler

### Security (slide 23)

- **NVD**: about 88,700 CVEs published Jan 1 to Oct 29, 2026 vs. about 39,300 in the same
  window of 2025 (2.3×). Q3 2026: 36,953, more than any full year before 2024. Caveats: about
  5,000 automated Linux kernel CVEs through August, more CNAs (484 to 559), NVD enrichment
  lagging. Microsoft's October 2026 Patch Tuesday was a record (about 1,400 CVEs).
  https://www.iru.com/blog/black-october
- **Google GTIG** (Sep 30, 2026): monthly disclosures doubled in 2026; 141 distinct exploited
  vulnerabilities in the first eight months vs. 127 in all of 2025 (18/month vs. 10.5);
  AI-discovered bugs skew towards RCE.
  https://www.securityweek.com/google-ai-is-changing-the-pace-and-profile-of-vulnerability-discovery
- **VulnCheck H1 2026**: 1,061 vulnerabilities attributed to AI-assisted discovery, 14
  confirmed exploited; no more or less likely to be exploited than others.
  https://www.infosecurity-magazine.com/news/one-percent-ai-vulnerabilities/
- **curl**: the HackerOne form was paused for July 2026 (the "summer of bliss", announced Jun 15).
  Oct 22, 2026, "ignore the slop": hundreds of recent reports, every single one had AI
  involved; "Since spring 2026 the slop reports are practically gone"; reports are typically
  accurate and come with good reproducers. Ignoring them is not an option. A Python project got
  82 vulnerability reports in one email (Open Source Security podcast, Sep 2026).
  - https://daniel.haxx.se/blog/2026/06/15/curl-summer-of-bliss/
  - https://daniel.haxx.se/blog/2026/10/22/ignore-the-slop/
  - https://opensourcesecurity.io/2026/2026-09-curl-bliss-stefan-daniel

### Open questions

- Do I want to say "Photoshop in a week, from the binary" on stage? The accurate version is
  ten days, from specs and observed behavior, and 45% ready by its own measure. REA is the
  binary reverse-engineering part.
- Bun and the formal verification work are both from Anthropic. Fine as evidence, but
  worth saying out loud.

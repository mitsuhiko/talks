# Pi Durable — Speaker Notes

Ten minutes without the demo. Each slide's notes also live in its data-notes attribute, which mini-presenter shows.

## 1. Pi Durable

Pi Durable: a library for building agents that survive their process.

- Armin Ronacher, Earendil.
- Ten minutes: what it is, why we built it, what code against it looks like, and what you get for free.

## 2. Pi Durable in four sentences

What Pi Durable is, in four statements.

- A library for building agents, in TypeScript. Not an app, not a hosted service. It runs anywhere there is JavaScript: Node, Bun, a Cloudflare Durable Object.
- Focused on durability and scheduling: every model request and every tool call is a durable task with a checkpoint, and a scheduler runs them.
- Single-player and multiplayer: one person in a terminal, or a Slack channel where many people talk to and steer the same agent.
- It recovers and tracks state: kill the process at any moment, open the storage again, and it continues. Your app's state lives next to the transcript.

## 3. Somebody has to recover the agent

Why we built it.

- Pi in a terminal: when the process dies, you notice, look at the transcript, and type continue. You are the recovery mechanism, and that is fine.
- Agents are leaving the terminal: Slack bots, email (Lefos), GitHub triage, agents in Durable Objects. Nobody watches those processes.
- The container is redeployed in the middle of a tool call. The question is never answered, the deploy may or may not have happened, and people ask again because the bot looked dead.
- If the human is not the recovery mechanism, the harness has to be.

## 4. Nothing is shown before it is stored

The one rule everything follows: nothing is visible until it is stored.

- Everybody who wants to change something, a user submitting, the model streaming, a tool printing output, goes through one line of atomic commits.
- Streaming tokens and tool output are committed too, at most every 100 ms. There is no volatile path to the screen.
- The screen is a window onto storage, not onto the process. So a crash loses at most the last 100 ms, and reopening the storage is all recovery needs.
- And any number of screens can look through that window: that is where multiplayer comes from.

## 5. Open a harness, ask a question

What code against it looks like. This is the whole setup.

- The registry holds the tools this process can run; CodingTools installs read, write, edit and bash.
- A harness opens over a storage. SQLite here; JSONL, memory, or a Durable Object work the same way.
- The root conversation is created on first open and is the same one after every restart.
- submit durably admits the input. The requestId makes it exactly-once: submit it again and you get the same submission back.
- wait resolves with the answer, even if the process that started the work died in between.

## 6. One question, as tasks and records

What that one question turns into in storage. Every step on the right is a commit; the chat on the left is drawn from it.

- Submit: a submission, a user entry, and a generation task, pending.
- The generation runs; the partial answer is committed to pi.live as it streams.
- The model asks for two tools: the answer is stored, two tool tasks are created, the generation waits for them.
- The tools finish and store their results; a fresh generation takes over the run.
- The final answer is stored, the submission is done.
- Everything the harness runs is a task like these: model requests, tool calls, compaction, and your own.

## 7. kill -9, then open it again

Now the process dies in the middle of the bash call, while somebody else in the channel sends a correction.

- kill -9: the process is gone. The storage is not: every row is still there, including bash in the middle of executing and the queued steer.
- A new process opens the same file. The only thing reopening does: running tasks become pending. resume() starts the scheduler, and root() returns the same conversation.
- bash is not marked safe to rerun, so it is not repeated: the model gets an interrupted result with the output stored so far. The steer is placed at the next boundary, and a new generation continues.
- Slack, which never got an answer, retries the webhook with the same requestId and gets the same submission back, not a second question.
- There is no recovery code. It is the ordinary machinery.

## 8. Tools say whether they are safe to rerun

Durability cannot make a side effect happen exactly once. What it can do is tell you which effect is in doubt.

- Every tool call commits its intent, the final arguments, before it runs, and its result after.
- If the process dies in between, exactly that call may or may not have happened.
- A tool that only reads says replay: safe, and simply runs again with the stored arguments.
- Any other tool is never repeated: the model is told it was interrupted, with the output stored so far, and decides what to do.
- api.output streams to every client watching, committed like everything else.

## 9. Your own work is a durable task too

Scheduling: your own work gets the same machinery as model requests and tool calls.

- A task is a small state machine: named phases, and a checkpoint that says which phase is next.
- A phase commits its next checkpoint or its outcome. A phase that writes nothing down is a fault.
- Sleeps are wall-clock deadlines, so a reminder for tomorrow survives any number of restarts.
- The delivery uses a requestId derived from the task, so a restart never delivers twice.
- Tasks form one ownership tree with conversations: Esc aborts what a task owns, and cleanup runs from the leaves up. A subagent is just a conversation owned by a tool call.

## 10. Every client watches the same committed state

Multiplayer falls out of the one rule: everything a UI needs is committed state.

- Any number of clients attach to a conversation. Each gets the current view first, then only what changes.
- A client that joins late, or reconnects, starts from the current view. Nothing is replayed.
- Anyone can steer a running conversation. The steer is queued durably and placed at the next turn boundary; a follow-up waits for the answer.
- For remote clients, watch delivers the exact JSON operations of every commit, small enough for a socket.
- A Slack thread is a fork of the channel conversation: it sees the channel up to the message it replies to, without copying it.

## 11. Your state, committed with the transcript

An agent is rarely the whole application: there is a todo list, a plan, a ticket, the sandbox a conversation runs in.

- That state lives in documents: typed JSON, stored next to the transcript.
- A tool's result and the document change it made land in the same atomic commit, so the state never disagrees with the transcript that produced it.
- Each document says what a fork starts with: here, the todos as they were at the fork point.
- UIs subscribe to the committed value, like the conversation view.

## 12. The benefits, for free

What you get without writing any of it yourself.

- Survives crashes: reopen the storage and every task continues from its checkpoint.
- Exactly-once input: retries with a requestId return the same submission.
- Honest about side effects: safe tools rerun, others are reported as interrupted.
- Durable scheduling: timers, retries and child tasks survive restarts.
- Esc that works: abort flows down the ownership tree, cleanup runs bottom-up.
- Multiplayer: many clients, late join, steering, all from committed state.
- State that never disagrees with the transcript; forks see the right version.
- Change it while it runs: conversations store names, so a reload and a restart work the same way.
- Runs anywhere: memory, SQLite, JSONL, Durable Objects; tools on this machine or another.

## 13. The sandbox sleeps while the model thinks

Demo (not part of the ten minutes): Pi Durable with Gondolin. The agent's sandbox VM only exists while tools run.

- Two seconds after the last tool call the VM's disk is checkpointed (about 70 ms) and the VM is gone; it wakes from the checkpoint in half a second.
- Watch the panel: the sandbox timeline is empty exactly where the model timeline is busy.
- kill -9 in the middle of the analysis; the restart kills the orphaned VM and reruns the call from the checkpoint taken before it started.
- The follow-up question runs against the logs still on the sandbox's disk.
- Live alternative: ./gondolin-demo/demo --reset --crash-on 'scanning gw-3', then ./gondolin-demo/demo.

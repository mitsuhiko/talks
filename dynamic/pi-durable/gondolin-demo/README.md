# Pi Durable + Gondolin: the sandbox sleeps while the agent thinks

An incident-analysis agent on Pi Durable. Its tools run in a Gondolin micro-VM that only exists while tools run: two
seconds after the last tool call the VM's disk is checkpointed in the background and the VM is gone. Model inference
takes longer than that, so while the model thinks there is no VM. The next tool call resumes it from the checkpoint in
about half a second.

## The scenario

Overnight, card payments failed at a handful of merchants. The payment gateway vendor sent a log export
(`gateway-logs-2026-10-12.tar.gz`, 7.5 MB, 85 MB unpacked: four gateway nodes, one JSON line per authorization, plus a
deploy log). It is a third party's archive full of merchant data, which is why it goes into a sandbox, not onto a
laptop. The agent:

1. lists the archive before unpacking it, then unpacks it and reads the vendor's README;
2. counts non-approved codes per node with a throwaway Python snippet: everything unusual is `E_TLS_HANDSHAKE` on gw-3;
3. greps the deploy log: at 02:09:58 gw-3 installed a nordbank client certificate from a CA nordbank does not trust;
4. writes `analyze.py` and runs it: 7,814 failures, 02:09:59 to 03:41:10, 10 merchants, EUR 355,419.55;
5. writes `report.md`, answers.

Then a follow-up ("who should support call first?") runs `analyze.py` again over the logs still on the sandbox's disk.
Nothing is unpacked twice; the sandbox slept in between.

The data is generated deterministically by `scenario/generate.ts`. The model is scripted (pi-ai's faux provider,
`scenario/script.ts`): no API key, no network, the same run every time.

## Running it

```sh
./demo --reset                          # fresh start; Enter sends the prefilled prompt
./demo --reset --crash-on "scanning gw-3"   # same, but kill -9 itself in the middle of analyze.py
./demo                                  # continue after a crash, or later for the follow-up question
```

Keys: Enter sends (the next prompt is prefilled), Ctrl+K is `kill -9` at any moment, Ctrl+C saves the sandbox and quits.
Needs QEMU and a Gondolin checkout at `~/Development/gondolin` (with `host/dist` built), and pi-mono at
`~/Development/pi-mono` (`PI_MONO` overrides it; `./demo` symlinks its `node_modules`).

The panel at the bottom is the point of the demo: the state of the VM (awake, idle with a countdown, saving, asleep),
a timeline of the sandbox next to a timeline of model inference, and the sandbox's last events. `state/events.log` has
all of them with timestamps.

## Two crashes worth showing

**During a tool call** (`--crash-on "scanning gw-3"`): the process dies while `analyze.py` runs. On restart the
orphaned QEMU is killed, the interrupted call reruns from the last checkpoint (taken before it started, so the killed
attempt left no trace), and the model gets a note that the call ran again. The run finishes as if nothing happened.

**During the grace period** (Ctrl+K within two seconds after a tool call, e.g. right after `write analyze.py`): that
call's changes were never checkpointed. On restart the sandbox comes back from the older checkpoint and tells the model
exactly which calls were lost ("Changes made by these earlier calls were lost: write analyze.py"). The model (here the
script, as a real one would) redoes them. Durability cannot keep what was never saved, but it never pretends.

## How it works

- `sandbox.ts` wraps read, write, edit, and bash. A call wakes the VM (or reuses it within the grace period), runs, and
  returns; a timer then checkpoints (or, without changes, discards) the VM and commits the checkpoint to the
  conversation's `app.sandbox` document.
- Intent and outcome, as for every Durable effect: before a call changes the disk it is added to `app.sandbox.unsaved`
  in a commit; the checkpoint commit clears the list. A checkpoint is only taken once every unsaved call's tool task is
  terminal, so it never contains changes whose result the transcript does not have.
- After a crash, everything in `unsaved` is rolled back. The interrupted call itself reruns, which is why the tools are
  declared `replay: "safe"`; the others are reported as a diagnostic on the next call.
- `gondolin-env.ts` is a Durable `ExecutionEnv` over `vm.fs` and `vm.exec`, with what the built-in tools use.
- `main.ts` is the TUI (pi-tui). The transcript is rendered from the conversation's committed view, so a restarted
  process shows the same screen from storage.

## Measured (M-series Mac, QEMU with hvf)

| | |
|---|---|
| wake: resume a checkpoint to first command | 450 to 580 ms |
| sleep: checkpoint, which stops the VM | 65 to 80 ms |
| checkpoint size with the unpacked logs | 96 to 98 MB (only the newest is kept) |
| `analyze.py` over 360,000 log lines | about 1.3 s |

## Limits

- Disk-only checkpoints: no memory or processes survive sleep, so nothing can keep running between tool calls.
- `/tmp`, `/root`, `/var/log` are tmpfs in the guest and are lost on every sleep; work happens in `/work`.
- One VM per conversation, so sandboxed tools run one at a time.
- Rolled back means rolled back inside the VM only; network effects are not (Gondolin's egress policy can limit them).
- Checkpoints are standalone overlays (~100 MB here); superseded ones are deleted, so a fork gets a fresh sandbox.
- The env implements what the built-in tools need, not all of `ExecutionEnv`.

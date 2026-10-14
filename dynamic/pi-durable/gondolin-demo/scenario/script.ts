// The scripted model for the incident scenario (pi-ai's faux provider).
//
// The next step is chosen from the request itself, by counting the assistant messages the model already produced, so
// the script continues correctly after a restart: an answer cut off by a crash is not part of the context, and is
// simply produced again.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import {
	type FauxResponseFactory,
	fauxAssistantMessage,
	fauxText,
	fauxThinking,
	fauxToolCall,
} from "@earendil-works/pi-ai/providers/faux";
import { describe } from "../sandbox.ts";

export const BUNDLE = "incoming/gateway-logs-2026-10-12.tar.gz";

/** What the presenter "types"; the TUI prefills these one after the other. */
export const PROMPTS = [
	`Payments had an incident last night: from about 2am a lot of card payments failed, apparently at a handful of merchants. The gateway vendor sent their log export, it's in the sandbox at ${BUNDLE}. Find out what happened and write a short incident report to report.md.`,
	"Thanks. Support wants to call the affected merchants today. Who should they call first, and how much failed for each?",
];

const ANALYZE_PY = readFileSync(join(import.meta.dirname, "analyze.py"), "utf8");

const QUICK_LOOK = `python3 - <<'EOF'
import json, glob, collections
c = collections.Counter()
for f in sorted(glob.glob('logs/gw-*.jsonl')):
    for line in open(f):
        e = json.loads(line)
        if e['status'] != 'approved':
            c[(e['node'], e['code'])] += 1
for (node, code), n in sorted(c.items()):
    print(f'{node}  {code:<22} {n}')
EOF`;

const REPORT = `# INC-2291: card authorizations failing via gw-3 (2026-10-12)

## Summary
From 02:09:59 to 03:41:10 UTC every card authorization that gateway node gw-3 sent to the acquirer nordbank failed
the TLS handshake (\`E_TLS_HANDSHAKE\`, "peer did not accept client certificate chain"). 7,814 authorizations failed,
EUR 355,419.55 in total, across the 10 merchants that settle with nordbank. Other nodes and acquirers were unaffected.

## Cause
At 02:09:58 gw-3's cert-manager renewed the nordbank client certificate and installed one issued by
"Payments Issuing CA G2". nordbank does not (yet) trust G2. The other nodes still used G1 certificates.

## Resolution
At 03:41:12 on-call (mira) pinned the previous G1 certificate (serial 2B:77:E0:11:04); failures stopped immediately.

## Not related
gw-1 shows a latency bump around 04:18 (a 1.2 s GC pause); no failed authorizations.

## Follow-ups
- Block cert-manager from switching issuing CA per acquirer without a trust check against the acquirer.
- Alert on per-node, per-acquirer handshake failures (one node failing 100% was invisible in global error rates: 2.2%).
- Confirm with nordbank when G2 will be trusted before 2026-10-19, when the G1 certificate expires.
`;

const call = (thinking: string, name: string, args: Record<string, unknown>, id: string) =>
	fauxAssistantMessage([fauxThinking(thinking), fauxToolCall(name, args, { id })], { stopReason: "toolUse" });
const answer = (thinking: string, text: string) => fauxAssistantMessage([fauxThinking(thinking), fauxText(text)]);

const STEPS: AssistantMessage[] = [
	// Turn 1
	call(
		"This is an archive from a third party, so before unpacking anything I'll list it: no absolute paths, no ../ entries, nothing unexpected. Then unpack it here in /work and read the vendor's README.",
		"bash",
		{ command: `tar tzvf ${BUNDLE} && tar xzf ${BUNDLE} && cat README.txt && du -sh logs` },
		"inspect",
	),
	call(
		"Four gateway nodes, one JSON line per authorization attempt, plus a deploy log. First a coarse picture: which non-approved codes appear on which node. A throwaway Python snippet is enough for that.",
		"bash",
		{ command: QUICK_LOOK },
		"overview",
	),
	call(
		"The declines and upstream timeouts look the same on every node, so they are background noise. The only outlier is E_TLS_HANDSHAKE, 7,814 of them, all on gw-3. A TLS failure that appears on exactly one node smells like a configuration or certificate change. Let me look at the deploy log for the night.",
		"bash",
		{ command: "grep -E 'T0[1-4]:' logs/deploy.log" },
		"deploys",
	),
	call(
		"There it is: at 02:09:58 gw-3 installed a renewed nordbank client certificate issued by 'Payments Issuing CA G2', and at 03:41:12 on-call pinned back a G1 certificate. nordbank apparently does not trust G2. I want the exact window, confirmation that only gw-3 to nordbank is affected, and the impact per merchant. I'll write a small script so the numbers can be reproduced and rerun.",
		"write",
		{ path: "analyze.py", content: ANALYZE_PY },
		"script",
	),
	call(
		"Run it over all four nodes.",
		"bash",
		{ command: "python3 analyze.py logs --top 5" },
		"analyze",
	),
	call(
		"Confirmed. Only gw-3 to nordbank failed: 7,814 attempts from 02:09:59 to 03:41:10, 10 merchants, EUR 355,419.55. The gw-1 GC pause at 04:18 only added latency, no failures. Now the report.",
		"write",
		{ path: "report.md", content: REPORT },
		"report",
	),
	answer(
		"Report written. Summarize for the user.",
		"**What happened:** at 02:09:58 gateway node **gw-3** renewed its client certificate for the acquirer **nordbank** with one issued by a CA nordbank does not trust. Every nordbank authorization routed through gw-3 failed the TLS handshake until on-call pinned the old certificate at 03:41:12.\n\n**Impact:** 7,814 failed authorizations, EUR 355,419.55, at the 10 merchants that settle with nordbank. Nothing else was affected; the gw-1 latency bump at 04:18 is an unrelated GC pause.\n\nThe report is in `report.md`, and `analyze.py` reproduces the numbers.",
	),
	// Turn 2: the sandbox still has the unpacked logs and the script, so nothing needs to be redone.
	call(
		"The unpacked logs and analyze.py are still in the sandbox from earlier, so I can rank all affected merchants directly.",
		"bash",
		{ command: "python3 analyze.py logs --top 10" },
		"merchants",
	),
	answer(
		"Rank by failed volume, mention the counts.",
		"Call in this order (failed volume, failed attempts):\n\n1. Elektro Pichler: EUR 75,801.92 (817)\n2. Tabak Trafik 1070: EUR 65,712.69 (761)\n3. Buchladen Am Eck: EUR 44,796.49 (776)\n4. Copyshop Mariahilf: EUR 39,404.13 (761)\n5. Hotel Drei Linden: EUR 35,254.43 (724)\n6. Kaffeehaus Lindner: EUR 33,583.37 (780)\n7. Optik Wenzel: EUR 20,144.19 (797)\n8. Galerie Westlicht Nord: EUR 18,641.19 (809)\n9. Musikhaus Doblinger-Lenz: EUR 14,581.66 (802)\n10. Kino am Spittelberg: EUR 7,499.48 (787)\n\nThe top five account for about 73% of the failed volume.",
	),
];

/**
 * Pause before the first token. With the streaming time every step then takes longer than the sandbox's grace period,
 * as real inference does, so the sandbox goes to sleep while the model thinks.
 */
const FIRST_TOKEN_MS = 1800;

type Msg = { role: string; content: unknown };
const toolCalls = (message: Msg) =>
	Array.isArray(message.content)
		? (message.content as { type: string; id?: string; name?: string; arguments?: Record<string, unknown> }[]).filter(
				(part) => part.type === "toolCall",
			)
		: [];
const isRedo = (message: Msg) => toolCalls(message).some((part) => part.id?.startsWith("redo-"));
const resultText = (message: Msg) =>
	Array.isArray(message.content) ? (message.content as { text?: string }[]).map((part) => part.text ?? "").join("") : "";
const LOST = /Changes made by these earlier calls were lost: (.+?)\.\n/;

/** A real model would notice the sandbox's lost-changes warning and redo the work; so does the script. */
function redo(messages: Msg[]): AssistantMessage | undefined {
	const warnAt = messages.findLastIndex((message) => message.role === "toolResult" && LOST.test(resultText(message)));
	if (warnAt < 0) return undefined;
	const lost = LOST.exec(resultText(messages[warnAt]!))![1]!.split("; ");
	const failed = messages.slice(0, warnAt).findLast((message) => message.role === "assistant");
	const failedCall = failed ? toolCalls(failed)[0] : undefined;
	const todo = [...lost, ...(failedCall ? [describe(failedCall.name!, failedCall.arguments ?? {})] : [])];
	const done = messages.slice(warnAt + 1).filter((message) => message.role === "assistant" && isRedo(message)).length;
	if (done >= todo.length) return undefined;
	const original = STEPS.flatMap((step) => toolCalls(step as unknown as Msg)).find(
		(part) => describe(part.name!, part.arguments ?? {}) === todo[done],
	);
	if (original === undefined) return undefined;
	const thinking =
		done === 0
			? `The agent restarted and the sandbox was rolled back to its last checkpoint, losing: ${lost.join("; ")}. Redo that before going on.`
			: done < lost.length
				? "Next lost step."
				: "Now the step that failed because of it, again.";
	return call(thinking, original.name!, original.arguments ?? {}, `redo-${warnAt}-${done}`);
}

export const scriptedModel: FauxResponseFactory = async (context) => {
	await new Promise((resolve) => setTimeout(resolve, FIRST_TOKEN_MS));
	const messages = context.messages as Msg[];
	const recovery = redo(messages);
	if (recovery) return recovery;
	const step = messages.filter((message) => message.role === "assistant" && !isRedo(message)).length;
	return STEPS[step] ?? fauxAssistantMessage([fauxText("(The demo script has no more steps.)")]);
};

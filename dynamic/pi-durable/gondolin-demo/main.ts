// Pi Durable + Gondolin: an incident-analysis agent whose sandbox VM sleeps while the model thinks.
//
//   node --conditions=source main.ts                         start, or continue where the last process stopped
//   node --conditions=source main.ts --crash-on "scanning gw-3"  SIGKILL itself once a running tool prints the text
//   node --conditions=source main.ts --reset                 delete all state first
//
// Keys: Enter sends (the next scripted prompt is prefilled), Ctrl+K kill -9s the process, Ctrl+C quits cleanly.
import { appendFileSync, existsSync, readFileSync, rmSync, statSync, writeSync } from "node:fs";
import { join } from "node:path";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { createModels } from "@earendil-works/pi-ai/models";
import { fauxProvider } from "@earendil-works/pi-ai/providers/faux";
import { createRegistry, type EntryRecord, Harness } from "@earendil-works/pi-durable";
import { openNodeSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/node";
import {
	type Component,
	Editor,
	matchesKey,
	ProcessTerminal,
	TuiMainScreen,
	truncateToWidth,
	visibleWidth,
	wrapTextWithAnsi,
} from "@earendil-works/pi-tui";
import { Chalk } from "chalk";
import { generateBundle } from "./scenario/generate.ts";
import { BUNDLE, PROMPTS, scriptedModel } from "./scenario/script.ts";
import { createSandboxExtension, GRACE_MS, Sandbox, SandboxDoc, type SandboxEvent, type SandboxState } from "./sandbox.ts";

const chalk = new Chalk({ level: 3 });
const context = BACKGROUND_CONTEXT;
const args = process.argv.slice(2);
const crashOn = args.includes("--crash-on") ? args[args.indexOf("--crash-on") + 1] : undefined;
const dir = import.meta.dirname;
const state = join(dir, "state");

// ─── the agent ──────────────────────────────────────────────────────────────

let tui: TuiMainScreen | undefined;
const started = Date.now();
// Kill VMs a crashed process left behind first: a reset would delete their pid files.
const reaped = new Sandbox(state).reapOrphans();
if (args.includes("--reset")) rmSync(state, { recursive: true, force: true });
const sandbox = new Sandbox(state);

const faux = fauxProvider({ tokensPerSecond: 60 });
faux.setResponses(Array.from({ length: 200 }, () => scriptedModel));
const models = createModels();
models.setProvider(faux.provider);
const registry = createRegistry();
registry.install(createSandboxExtension(sandbox));

const storagePath = join(state, "agent.sqlite");
const fresh = !existsSync(storagePath);
const harness = await Harness.open(
	await openNodeSqliteStorage(storagePath),
	{ models, registry, env: sandbox.env, settings: { toolExecution: "sequential" } },
	context,
);
sandbox.attach(harness);
const root = await harness.root(context, {
	agent: { model: { provider: "faux", modelId: "faux-1" }, thinkingLevel: "medium" },
});
const pending = (await harness.inspect(context)).tasks.length;

const events: { at: number; event: SandboxEvent }[] = [];
let sandboxState: SandboxState = "asleep";
let sleepAt: number | undefined;
let vmPid: number | null | undefined;
sandbox.listeners.add((event) => {
	events.push({ at: Date.now(), event });
	appendFileSync(join(state, "events.log"), `${new Date().toISOString()} ${event.state.padEnd(6)} ${event.message}\n`);
	sandboxState = event.state;
	sleepAt = event.sleepAt;
	if (event.pid !== undefined) vmPid = event.pid;
	if (event.state === "asleep") vmPid = undefined;
	tui?.requestRender();
});

if (fresh) {
	// The user attaches the vendor's export: it goes straight into the sandbox's disk.
	const bundlePath = join(state, "gateway-logs-2026-10-12.tar.gz");
	if (!existsSync(bundlePath)) generateBundle(bundlePath);
	await sandbox.upload(root.id, { [`/work/${BUNDLE}`]: readFileSync(bundlePath) });
	await root.submit(
		{
			type: "write",
			entry: { kind: "app.attachment", data: { name: BUNDLE.split("/")[1]!, bytes: statSync(bundlePath).size } },
		},
		context,
	);
}

const view = await root.viewState(context);
const sandboxDoc = await harness.documentState(SandboxDoc, root.id, context);

// ─── rendering ──────────────────────────────────────────────────────────────

type Message = {
	role: string;
	content?: unknown;
	stopReason?: string;
	isError?: boolean;
	toolName?: string;
};
type Part = { type: string; text?: string; thinking?: string; name?: string; arguments?: Record<string, unknown> };

const indent = (lines: string[], prefix: string) => lines.map((line) => prefix + line);
const wrap = (text: string, width: number) => text.split("\n").flatMap((line) => wrapTextWithAnsi(line, Math.max(10, width)));

function callSummary(part: Part): string {
	const a = part.arguments ?? {};
	if (part.name === "bash") {
		const lines = String(a.command ?? "").split("\n");
		return lines[0]! + (lines.length > 1 ? chalk.dim(` … (+${lines.length - 1} lines)`) : "");
	}
	// While the model streams a call, its arguments arrive piece by piece.
	if (a.path === undefined) return chalk.dim("…");
	if (part.name === "write" && typeof a.content === "string") {
		return `${a.path} ${chalk.dim(`(${a.content.split("\n").length} lines)`)}`;
	}
	return String(a.path);
}

function renderAssistant(message: Message, width: number, live: boolean): string[] {
	const out: string[] = [];
	for (const part of (message.content as Part[] | undefined) ?? []) {
		if (part.type === "thinking" && part.thinking) out.push(...wrap(chalk.dim.italic(part.thinking), width - 2).map((l) => `  ${l}`));
		if (part.type === "text" && part.text) out.push(...wrap(part.text.replace(/\*\*(.+?)\*\*/g, chalk.bold("$1")), width - 2).map((l) => `  ${l}`));
		if (part.type === "toolCall") out.push(`  ${chalk.cyan("▸")} ${chalk.cyan.bold(part.name ?? "")} ${callSummary(part)}`);
	}
	if (live) out.push(chalk.magenta("  ▍"));
	if (message.stopReason === "aborted") out.push(chalk.yellow("  ✗ cut off: the process died while the model was answering"));
	if (message.stopReason === "error") out.push(chalk.red("  ✗ model error"));
	return out;
}

function tail(text: string, lines: number, width: number): string[] {
	const all = text.replace(/\n$/, "").split("\n");
	const shown = all.slice(-lines).map((line) => truncateToWidth(line, width - 6));
	return all.length > lines ? [chalk.dim(`… ${all.length - lines} more lines`), ...shown] : shown;
}

function renderEntry(entry: EntryRecord, width: number): string[] {
	const message = entry.model?.[0] as Message | undefined;
	switch (entry.kind) {
		case "app.attachment": {
			const data = entry.data as { name: string; bytes: number };
			return ["", chalk.blue(`  ⧉ attachment ${data.name} (${(data.bytes / 1e6).toFixed(1)} MB), placed in the sandbox`)];
		}
		case "pi.user":
			return ["", ...wrap(`${chalk.green.bold("you ›")} ${String(message?.content ?? "")}`, width)];
		case "pi.assistant":
			return ["", ...renderAssistant(message!, width, false)];
		case "pi.tool-result": {
			const parts = (message?.content as Part[] | undefined) ?? [];
			const text = parts.map((part) => part.text ?? "").join("").replace(/\n*<harness>[\s\S]*?<\/harness>\n*/g, "\n");
			const color = message?.isError ? chalk.red : chalk.gray;
			const lines = indent(tail(text, 8, width).map((line) => color(line)), chalk.dim("    │ "));
			for (const diagnostic of (entry.data as { diagnostics?: { severity: string; message: string }[] })?.diagnostics ?? []) {
				const tint = diagnostic.severity === "warn" ? chalk.yellow : diagnostic.severity === "error" ? chalk.red : chalk.blue;
				lines.push(...wrap(tint(`! ${diagnostic.message}`), width - 6).map((line) => `    ${line}`));
			}
			return lines;
		}
		default:
			return [];
	}
}

type Live = {
	generation?: { message?: Message; retry?: unknown };
	tools?: { name: string; status: string; output?: string }[];
};

class Transcript implements Component {
	render(width: number): string[] {
		const value = view.value as unknown as { entries: EntryRecord[]; docs: Record<string, unknown> };
		const lines = value.entries.flatMap((entry) => renderEntry(entry, width));
		const live = value.docs["pi.live"] as Live | undefined;
		if (live?.generation) {
			lines.push("");
			if (live.generation.message) lines.push(...renderAssistant(live.generation.message, width, true));
			else lines.push(chalk.magenta("  … thinking"));
		}
		for (const tool of live?.tools ?? []) {
			if (tool.status === "done") continue;
			lines.push(chalk.yellow(`    ⟳ ${tool.name} ${tool.status}`));
			if (tool.output) lines.push(...indent(tail(tool.output, 6, width).map((l) => chalk.gray(l)), chalk.dim("    │ ")));
		}
		return lines.map((line) => truncateToWidth(line, width));
	}
	invalidate(): void {}
}

// The timeline: one column per sample, newest on the right.
const SAMPLE_MS = 400;
const samples: { sandbox: SandboxState; thinking: boolean }[] = [];

const STATE_STYLE: Record<SandboxState, { glyph: string; color: (s: string) => string; label: string }> = {
	asleep: { glyph: "·", color: chalk.dim, label: "ASLEEP" },
	waking: { glyph: "▓", color: chalk.yellow, label: "WAKING" },
	busy: { glyph: "█", color: chalk.green, label: "AWAKE" },
	idle: { glyph: "▒", color: chalk.green, label: "IDLE" },
	saving: { glyph: "░", color: chalk.yellow, label: "SAVING" },
};

function box(title: string, body: string[], width: number): string[] {
	const inner = width - 4;
	const top = chalk.dim(`╭─ ${title} ${"─".repeat(Math.max(0, width - visibleWidth(title) - 5))}╮`);
	const rows = body.map((line) => {
		const cut = truncateToWidth(line, inner);
		return `${chalk.dim("│")} ${cut}${" ".repeat(Math.max(0, inner - visibleWidth(cut)))} ${chalk.dim("│")}`;
	});
	return [top, ...rows, chalk.dim(`╰${"─".repeat(width - 2)}╯`)];
}

class SandboxPanel implements Component {
	render(width: number): string[] {
		const style = STATE_STYLE[sandboxState];
		const doc = sandboxDoc?.value;
		const countdown = sandboxState === "idle" && sleepAt ? ` sleeping in ${Math.max(0, (sleepAt - Date.now()) / 1000).toFixed(1)} s` : "";
		const status = `${style.color(`● ${style.label}`)}${chalk.dim(countdown)}${vmPid ? chalk.dim(`  qemu pid ${vmPid}`) : ""}`;
		const disk = doc?.checkpoint
			? `disk: ${(doc.bytes / 1e6).toFixed(0)} MB checkpoint, saved ${doc.checkpoints}×` +
				(doc.unsaved.length ? chalk.yellow(`, ${doc.unsaved.length} call(s) not saved yet`) : "")
			: "disk: none yet";
		const columns = Math.max(10, width - 14);
		const recent = samples.slice(-columns);
		const timeline = (pick: (s: (typeof samples)[number]) => string) => recent.map(pick).join("");
		const live = (view.value as unknown as { docs: Record<string, Live | undefined> }).docs["pi.live"];
		const body = [
			`${status}   ${chalk.dim(disk)}`,
			`${chalk.dim("sandbox ")} ${timeline((s) => STATE_STYLE[s.sandbox].color(STATE_STYLE[s.sandbox].glyph))}`,
			`${chalk.dim("model   ")} ${timeline((s) => (s.thinking ? chalk.magenta("█") : chalk.dim("·")))}`,
			...events.slice(-4).map(({ at, event }) => chalk.dim(`${((at - started) / 1000).toFixed(1).padStart(6)}s `) + event.message),
		];
		const title = `gondolin sandbox · ${live?.generation ? chalk.magenta("model thinking") : "model idle"} · grace ${GRACE_MS / 1000} s`;
		return box(title, body, width);
	}
	invalidate(): void {}
}

class Footer implements Component {
	render(width: number): string[] {
		return [truncateToWidth(chalk.dim(" enter send · ctrl+k kill -9 · ctrl+c quit · storage: state/agent.sqlite"), width)];
	}
	invalidate(): void {}
}

// ─── the TUI ────────────────────────────────────────────────────────────────

const terminal = new ProcessTerminal();
tui = new TuiMainScreen(terminal);

const header = {
	render: (width: number) => {
		const lines = [chalk.bold(" INC-2291 triage") + chalk.dim(" · Pi Durable + Gondolin · scripted model")];
		if (!fresh) {
			const note = [
				`reopened ${storagePath.replace(`${dir}/`, "")}`,
				reaped.length ? `killed orphaned VM pid ${reaped.join(", ")}` : undefined,
				pending ? `${pending} task(s) to resume` : "nothing to resume",
			].filter(Boolean);
			lines.push(chalk.yellow(` ↻ ${note.join(" · ")}`));
		}
		return lines.map((line) => truncateToWidth(line, width));
	},
	invalidate() {},
};

const editor = new Editor(tui, { borderColor: (s: string) => chalk.dim(s), selectList: {} as never });
const nextPrompt = () => {
	const asked = (view.value as unknown as { entries: EntryRecord[] }).entries.filter((e) => e.kind === "pi.user").length;
	return PROMPTS[asked] ?? "";
};
editor.setText(nextPrompt());
editor.onSubmit = (text) => {
	if (!text.trim()) return;
	void root.submit({ type: "input", content: text.trim() }, context).then(() => {
		editor.setText(nextPrompt());
		tui!.requestRender();
	});
	editor.setText("");
};

tui.addChild(header);
tui.addChild(new Transcript());
tui.addChild({ render: () => [""], invalidate() {} });
tui.addChild(new SandboxPanel());
tui.addChild(editor);
tui.addChild(new Footer());
tui.setFocus(editor);

async function quit(): Promise<void> {
	tui!.stop();
	console.log(chalk.dim("saving the sandbox and closing…"));
	await sandbox.flush();
	await harness.close(context);
	process.exit(0);
}

let crashing = false;
function crash(reason: string): void {
	if (crashing) return;
	crashing = true;
	appendFileSync(join(state, "events.log"), `${new Date().toISOString()} crash  kill -9 (${reason})\n`);
	try {
		tui!.stop();
	} catch {}
	writeSync(1, chalk.red.bold(`\n✗ kill -9 (${reason}). Run the demo again to continue.\n`));
	process.kill(process.pid, "SIGKILL");
}

tui.addInputListener((data) => {
	if (matchesKey(data, "ctrl+c")) {
		void quit();
		return { consume: true };
	}
	if (matchesKey(data, "ctrl+k")) {
		crash("ctrl+k");
		return { consume: true };
	}
	return undefined;
});

view.subscribe(() => tui!.requestRender());
sandboxDoc?.subscribe(() => tui!.requestRender());
setInterval(() => {
	const live = (view.value as unknown as { docs: Record<string, Live | undefined> }).docs["pi.live"];
	samples.push({ sandbox: sandboxState, thinking: live?.generation !== undefined });
	if (samples.length > 400) samples.shift();
	if (crashOn && live?.tools?.some((tool) => tool.status !== "done" && tool.output?.includes(crashOn))) {
		crash(`tool output reached "${crashOn}"`);
	}
	tui!.requestRender();
}, SAMPLE_MS);

tui.start();
harness.resume(); // continue whatever the last process left unfinished

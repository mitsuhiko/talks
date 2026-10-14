// A Gondolin sandbox that sleeps whenever the agent does not need it.
//
// A sandboxed tool call wakes the conversation's VM (resuming its disk from the last checkpoint), runs, and returns
// at once. Two seconds after the last call the VM is checkpointed in the background, which stops it, and the new
// checkpoint is committed to the conversation's `app.sandbox` document. Model inference usually takes longer than
// that, so while the agent thinks there is no VM; the next tool call brings it back. A call within the grace period
// reuses the running VM.
//
// Durability, in the effect-sandwich style:
// - intent: before a call changes the disk, it is added to `app.sandbox.unsaved` (a commit);
// - outcome: the checkpoint commit clears `unsaved`.
// After a crash, the VM is gone and everything in `unsaved` is rolled back to the last checkpoint. A call that was
// interrupted reruns from that checkpoint (so the tools are replay safe as far as the sandbox goes); earlier calls whose
// changes were lost are reported to the model as a diagnostic instead of silently missing.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Context } from "@earendil-works/chord";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import {
	type ConversationId,
	defineDoc,
	defineExtension,
	type Harness,
	type TaskId,
	type ToolExecutionApi,
	type ToolRegistration,
} from "@earendil-works/pi-durable";
import { createBashTool, createEditTool, createReadTool, createWriteTool } from "@earendil-works/pi-durable/tools";
import { VM, VmCheckpoint } from "../../../../gondolin/host/dist/src/index.js";
import { GondolinEnv, type GondolinVm } from "./gondolin-env.ts";

export const GRACE_MS = 2000;
const DISK_SIZE = "1G";

type Unsaved = { taskId: number; call: string };

/** The conversation's sandbox: its disk checkpoint and the calls whose changes are not in it yet. */
export const SandboxDoc = defineDoc<{ checkpoint: string | null; checkpoints: number; bytes: number; unsaved: Unsaved[] }>(
	{
		kind: "app.sandbox",
		version: 1,
		scope: "conversation",
		history: "latest",
		// Superseded checkpoint files are deleted, so a fork gets a fresh sandbox rather than a shared file.
		fork: "initial",
		initial: () => ({ checkpoint: null, checkpoints: 0, bytes: 0, unsaved: [] }),
	},
);

export type SandboxState = "asleep" | "waking" | "busy" | "idle" | "saving";
export type SandboxEvent = {
	conversationId: ConversationId;
	state: SandboxState;
	message: string;
	/** For `idle`: when the background save starts. */
	sleepAt?: number;
	pid?: number | null;
};

type Vm = InstanceType<typeof VM>;
type Live = { vm: Vm; dirty: boolean; active: number; timer?: ReturnType<typeof setTimeout> };

export class Sandbox {
	readonly #dir: string;
	readonly #live = new Map<ConversationId, Live>();
	readonly #saving = new Map<ConversationId, Promise<void>>();
	#harness: Harness | undefined;
	readonly listeners = new Set<(event: SandboxEvent) => void>();

	constructor(dir: string) {
		this.#dir = dir;
		mkdirSync(dir, { recursive: true });
	}

	attach(harness: Harness): void {
		this.#harness = harness;
	}

	#emit(event: SandboxEvent): void {
		for (const listener of this.listeners) listener(event);
	}

	/** A VM whose host process was SIGKILLed keeps running; kill those first. Returns the pids killed. */
	reapOrphans(): number[] {
		const killed: number[] = [];
		for (const name of readdirSync(this.#dir).filter((file) => file.endsWith(".pid"))) {
			const pid = Number(readFileSync(join(this.#dir, name), "utf8"));
			try {
				process.kill(pid, "SIGKILL");
				killed.push(pid);
			} catch {}
			rmSync(join(this.#dir, name));
		}
		return killed;
	}

	/** `HarnessOptions.env`: an env bound to whichever VM is awake for the conversation. Building it wakes nothing. */
	env = ({ conversationId }: { conversationId: ConversationId }) =>
		new GondolinEnv({
			id: `gondolin:${conversationId}`,
			cwd: "/work",
			current: () => {
				const live = this.#live.get(conversationId);
				if (live === undefined) throw new Error("the sandbox is asleep (env used outside a sandboxed tool call)");
				return live.vm as unknown as GondolinVm;
			},
		});

	/** Puts files into the sandbox before the agent starts, like a user uploading an attachment. */
	async upload(conversationId: ConversationId, files: Record<string, Uint8Array>): Promise<void> {
		const harness = this.#harness!;
		const conversation = (await harness.conversation(conversationId, BACKGROUND_CONTEXT))!;
		const vm = await VM.create({ rootfs: { size: DISK_SIZE }, sessionLabel: `pi-durable:${conversationId}` });
		for (const [path, data] of Object.entries(files)) {
			await vm.exec(["mkdir", "-p", path.slice(0, path.lastIndexOf("/"))]);
			await vm.fs.writeFile(path, data);
		}
		const out = this.#checkpointPath(conversationId, 1);
		await vm.checkpoint(out);
		await conversation.commit(async (tx) => {
			const doc = await tx.doc(SandboxDoc, conversationId);
			doc.checkpoint = out;
			doc.checkpoints++;
			doc.bytes = statSync(out).size;
		}, BACKGROUND_CONTEXT);
		this.#emit({ conversationId, state: "asleep", message: `upload saved as ${label(out)} (${mb(out)})` });
	}

	async run<T>(api: ToolExecutionApi, context: Context, call: string, mutates: boolean, body: () => Promise<T>): Promise<T> {
		const id = api.conversationId;
		await this.#saving.get(id);
		let live = this.#live.get(id);
		if (live === undefined) {
			live = await this.#wake(api, context);
		} else {
			clearTimeout(live.timer);
			this.#emit({ conversationId: id, state: "busy", message: `reusing the running VM (${call})` });
		}
		live.active++;
		this.#emit({ conversationId: id, state: "busy", message: call, pid: live.vm.getHostPid() });
		if (mutates) {
			live.dirty = true;
			await api.commit(async (tx) => {
				const doc = await tx.doc(SandboxDoc, id);
				if (!doc.unsaved.some((entry) => entry.taskId === api.taskId)) doc.unsaved.push({ taskId: api.taskId, call });
			}, context);
		}
		try {
			return await body();
		} finally {
			live.active--;
			if (live.active === 0) {
				const sleepAt = Date.now() + GRACE_MS;
				live.timer = setTimeout(() => void this.#sleep(id, live!), GRACE_MS);
				this.#emit({ conversationId: id, state: "idle", message: "idle; sleeping in 2 s", sleepAt });
			}
		}
	}

	async #wake(api: ToolExecutionApi, context: Context): Promise<Live> {
		const id = api.conversationId;
		const started = performance.now();
		const doc = await api.snapshot(SandboxDoc, id, context);
		const base = doc?.checkpoint ?? null;
		this.#emit({ conversationId: id, state: "waking", message: base ? `waking from ${label(base)}` : "booting a fresh VM" });
		const vm =
			base === null
				? await VM.create({ rootfs: { size: DISK_SIZE }, sessionLabel: `pi-durable:${id}` })
				: await VmCheckpoint.load(base).resume({ sessionLabel: `pi-durable:${id}` });
		await vm.exec(["mkdir", "-p", "/work"]); // also waits until the guest answers
		writeFileSync(this.#pidFile(id), String(vm.getHostPid()));
		const live: Live = { vm, dirty: false, active: 0 };
		this.#live.set(id, live);
		this.#emit({
			conversationId: id,
			state: "busy",
			message: `woke from ${base ? label(base) : "a fresh disk"} in ${Math.round(performance.now() - started)} ms`,
			pid: vm.getHostPid(),
		});

		// Calls recorded as unsaved belong to a process that died before checkpointing: their changes are gone.
		const unsaved = doc?.unsaved ?? [];
		if (unsaved.length > 0) {
			await api.commit(async (tx) => {
				(await tx.doc(SandboxDoc, id)).unsaved = [];
			}, context);
			const lost = unsaved.filter((entry) => entry.taskId !== api.taskId);
			if (lost.length > 0) {
				api.diagnostic({
					severity: "warn",
					message: `The sandbox was restored from its last checkpoint after a restart. Changes made by these earlier calls were lost: ${lost.map((entry) => entry.call).join("; ")}.`,
				});
			}
			if (lost.length < unsaved.length) {
				api.diagnostic({
					severity: "info",
					message: "This call was interrupted by a restart and ran again from the last checkpoint.",
				});
			}
			this.#emit({
				conversationId: id,
				state: "busy",
				message: `rolled back ${unsaved.length} unsaved call${unsaved.length === 1 ? "" : "s"} from the crashed process`,
			});
		}
		return live;
	}

	/** The background half: wait for results to be committed, then checkpoint (stopping the VM) or discard. */
	#sleep(id: ConversationId, live: Live): Promise<void> {
		if (this.#live.get(id) !== live || live.active > 0) return Promise.resolve();
		const saving = (async () => {
			const harness = this.#harness!;
			this.#emit({ conversationId: id, state: "saving", message: live.dirty ? "checkpointing" : "discarding" });
			const started = performance.now();
			// A checkpoint may only contain calls whose results are committed.
			const doc = await harness.snapshot(SandboxDoc, id, BACKGROUND_CONTEXT);
			for (const entry of doc?.unsaved ?? []) {
				while ((await harness.getTask(entry.taskId as TaskId, BACKGROUND_CONTEXT))?.state.status !== "terminal") {
					await new Promise((resolve) => setTimeout(resolve, 50));
				}
			}
			this.#live.delete(id);
			if (!live.dirty) {
				await live.vm.close();
				this.#emit({ conversationId: id, state: "asleep", message: "nothing changed; VM discarded" });
			} else {
				const out = this.#checkpointPath(id, (doc?.checkpoints ?? 0) + 1);
				await live.vm.checkpoint(out);
				const previous = doc?.checkpoint;
				const conversation = (await harness.conversation(id, BACKGROUND_CONTEXT))!;
				await conversation.commit(async (tx) => {
					const sandbox = await tx.doc(SandboxDoc, id);
					sandbox.checkpoint = out;
					sandbox.checkpoints++;
					sandbox.bytes = statSync(out).size;
					sandbox.unsaved = [];
				}, BACKGROUND_CONTEXT);
				if (previous && previous !== out) rmSync(previous, { force: true });
				this.#emit({
					conversationId: id,
					state: "asleep",
					message: `saved ${label(out)} (${mb(out)}) in ${Math.round(performance.now() - started)} ms; VM gone`,
				});
			}
			rmSync(this.#pidFile(id), { force: true });
		})();
		this.#saving.set(id, saving);
		return saving.finally(() => this.#saving.delete(id));
	}

	/** Save every idle sandbox now (for a clean exit). */
	async flush(): Promise<void> {
		await Promise.all(
			[...this.#live.entries()].map(([id, live]) => {
				clearTimeout(live.timer);
				return this.#sleep(id, live);
			}),
		);
		await Promise.all(this.#saving.values());
	}

	#checkpointPath(id: ConversationId, n: number): string {
		return join(this.#dir, `sandbox-${id}-cp${n}-${Date.now()}.qcow2`);
	}
	#pidFile(id: ConversationId): string {
		return join(this.#dir, `vm-${id}.pid`);
	}
}

const label = (path: string) => `checkpoint #${/-cp(\d+)-/.exec(path)?.[1] ?? "?"}`;
const mb = (path: string) => (existsSync(path) ? `${(statSync(path).size / 1e6).toFixed(0)} MB` : "?");

/** How a call is named in `unsaved` and in the lost-changes diagnostic. */
export function describe(name: string, args: Record<string, unknown>): string {
	if (name === "bash") return `bash: ${String(args.command).split("\n")[0]!.slice(0, 60)}`;
	return `${name} ${String(args.path ?? "")}`;
}

function sandboxed<T extends ToolRegistration>(sandbox: Sandbox, tool: T, mutates: boolean): T {
	return {
		...tool,
		replay: "safe", // a rerun starts from the last checkpoint, without the interrupted attempt's changes
		executionMode: "sequential", // one VM per conversation: calls take turns
		execute: (args: never, api: ToolExecutionApi, context: Context) =>
			sandbox.run(api, context, describe(tool.name, args), mutates, () => tool.execute(args, api, context)),
	} as T;
}

export function createSandboxExtension(sandbox: Sandbox) {
	return defineExtension({
		name: "gondolin",
		tools: [
			sandboxed(sandbox, createReadTool(), false),
			sandboxed(sandbox, createWriteTool(), true),
			sandboxed(sandbox, createEditTool(), true),
			sandboxed(sandbox, createBashTool(), true),
		],
	});
}

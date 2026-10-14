// The code samples on the slides, type-checked against pi-durable (not run). To check: copy this file to
// pi-mono/packages/durable/test/ and run `npx tsc --noEmit` with a tsconfig that extends pi-mono's tsconfig.json
// and includes only this file.
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import { Type } from "@earendil-works/pi-ai";
import { createModels } from "@earendil-works/pi-ai/models";
import { NodeExecutionEnv } from "../src/env/node.ts";
import { createRegistry, defineDoc, defineExtension, defineTask, defineTool, Harness } from "../src/index.ts";
import { openNodeSqliteStorage } from "../src/storage/sqlite/node.ts";
import { CodingTools } from "../src/tools/index.ts";

declare const tracker: { search(query: string): Promise<string> };
declare const ci: { deploy(version: string): Promise<string> };
declare function render(value: unknown): void;
declare function renderTodos(items: string[]): void;
declare const socket: { send(data: string): void };

const context = BACKGROUND_CONTEXT;
const models = createModels();
const env = ({ cwd }: { cwd?: string }) => new NodeExecutionEnv({ cwd: cwd ?? process.cwd() });

// ── slide: open a harness, ask a question ───────────────────────────────────
const registry = createRegistry();
registry.install(CodingTools); // read, write, edit, bash

const harness = await Harness.open(
	await openNodeSqliteStorage("./agent.sqlite"),
	{ models, registry, env },
	context,
);
const root = await harness.root(context, {
	agent: { model: { provider: "openai", modelId: "gpt-6-sol" } },
});

const job = { type: "input", content: "Fix the flaky login test", requestId: "job-42" } as const;
const submission = await root.submit(job, context);
const settled = await submission.wait(context);

// ── slide: after a crash ────────────────────────────────────────────────────
{
	// a new process opens the same file
	const harness = await Harness.open(
		await openNodeSqliteStorage("./agent.sqlite"),
		{ models, registry, env },
		context,
	);
	harness.resume(); // continue pending tasks
	const root = await harness.root(context);

	// a client retrying after the crash:
	await root.submit(job, context); // → S1 again
}

// ── slide: tools ────────────────────────────────────────────────────────────
const searchIssues = defineTool({
	name: "search_issues",
	description: "Search the issue tracker",
	parameters: Type.Object({ query: Type.String() }),
	replay: "safe", // only reads: rerun after a crash
	execute: async (args, api) => {
		api.output(`searching for ${args.query}\n`);
		const text = await tracker.search(args.query);
		return { output: [{ type: "text", text }] };
	},
});

const deploy = defineTool({
	name: "deploy",
	description: "Deploy a version to production",
	parameters: Type.Object({ version: Type.String() }),
	// no replay: interrupted means the model is told
	execute: async (args) => {
		const text = await ci.deploy(args.version);
		return { output: [{ type: "text", text }] };
	},
});

// ── slide: scheduling ───────────────────────────────────────────────────────
type State = { phase: "wait" } | { phase: "deliver" };
const Reminder = defineTask<{ text: string; at: number }, State, null>({
	name: "app.reminder",
	version: 1,
	initial: () => ({ phase: "wait" }),
	phases: {
		wait: async (task, runtime, ctx) => {
			await runtime.sleep(task.input.at, ctx); // wall-clock deadline
			await runtime.commit(() => ({
				status: "running", checkpoint: { phase: "deliver" } }), ctx);
		},
		deliver: async (task, runtime, ctx) => {
			const chat = await runtime.conversation(task.conversationId, ctx);
			await chat!.submit({ type: "input", content: task.input.text,
				requestId: `reminder:${task.id}` }, ctx);
			await runtime.commit(() => ({ status: "terminal",
				outcome: { status: "completed", result: null } }), ctx);
		},
	},
	abort: (_task, runtime, ctx) => runtime.commit(() => ({
		status: "terminal", outcome: { status: "aborted" } }), ctx),
});

const remind = defineTool({
	name: "remind",
	description: "Remind the user about something later",
	parameters: Type.Object({ text: Type.String(), at: Type.Number() }),
	execute: async (args, api, ctx) => {
		await api.createTask(Reminder, args, { ownership: { kind: "conversation" }, background: true }, ctx);
		return { output: [{ type: "text", text: "Reminder set." }] };
	},
});
registry.install(defineExtension({ name: "ops", tools: [searchIssues, deploy, remind], tasks: [Reminder] }));

// ── slide: multiplayer ──────────────────────────────────────────────────────
{
	const thread = root;
	// any client, any time: the current view first, then only what changes
	const view = await thread.viewState(context);
	render(view.value);
	view.subscribe((value) => render(value));

	// anyone can steer the running conversation
	await thread.submit({
		type: "input",
		content: "Check the staging logs first",
		whenBusy: "steer",
	}, context);

	// for remote clients: the exact operations of every commit
	const watch = await thread.watch(context);
	watch.start(async (_value, ops) =>
		socket.send(JSON.stringify(ops)));
}

// ── slide: state ────────────────────────────────────────────────────────────
const Todos = defineDoc<{ items: string[] }>({
	kind: "app.todos",
	version: 1,
	scope: "conversation",
	history: "rewindable",
	fork: "asOf", // a fork sees the todos as of its fork point
	initial: () => ({ items: [] }),
});

const todo = defineTool({
	name: "todo",
	description: "Add an item to your todo list",
	parameters: Type.Object({ item: Type.String() }),
	execute: async (args, api, ctx) => {
		// the tool result and the todo list land in the same atomic commit
		await api.commit(async (tx) => {
			const list = await tx.doc(Todos, api.conversationId);
			list.items.push(args.item);
		}, ctx);
		return { output: [{ type: "text", text: `Added ${args.item}` }] };
	},
});
registry.install(defineExtension({ name: "todo", tools: [todo] }));

const todos = await harness.documentState(Todos, root.id, context);
todos?.subscribe((value) => renderTodos(value?.items ?? []));

export { settled };

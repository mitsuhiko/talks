// A Pi Durable ExecutionEnv whose files and processes live in a Gondolin micro-VM.
//
// The env never owns a VM. It asks `current()` for the VM that is awake right now (the sandbox extension wakes one
// around every tool call) and fails when there is none. Only what Durable's built-in tools use is implemented; the
// rest reports `not_supported`.
import { posix } from "node:path";
import type { Context } from "@earendil-works/chord";
import {
	type BinaryReader,
	ExecutionError,
	type ExecutionEnv,
	err,
	FileError,
	type FileInfo,
	LineScanner,
	ok,
	type Result,
	type ShellExecOptions,
	type ShellExecResult,
} from "@earendil-works/pi-durable/env";

// Only the parts of Gondolin's VM this env uses.
export type GondolinVm = {
	exec(command: string[], options: Record<string, unknown>): Promise<{ exitCode: number }> & {
		stdout?: NodeJS.ReadableStream | null;
		stderr?: NodeJS.ReadableStream | null;
	};
	fs: {
		readFile(path: string): Promise<Buffer>;
		writeFile(path: string, data: string | Uint8Array): Promise<void>;
		mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
		stat(path: string): Promise<{ isDirectory(): boolean; isSymbolicLink?(): boolean; size: number; mtimeMs: number }>;
	};
};

function fileError(error: unknown, path: string): FileError {
	const code = (error as { code?: string })?.code;
	const message = error instanceof Error ? error.message : String(error);
	if (code === "ENOENT" || /no such file|ENOENT/i.test(message)) return new FileError("not_found", message, path);
	if (code === "EISDIR") return new FileError("is_directory", message, path);
	if (code === "EACCES" || code === "EPERM") return new FileError("permission_denied", message, path);
	return new FileError("unknown", message, path);
}

const unsupported = async (): Promise<Result<never, FileError>> =>
	err(new FileError("not_supported", "not supported by the Gondolin demo env"));

export class GondolinEnv implements ExecutionEnv {
	readonly id: string;
	cwd: string;
	readonly #current: () => GondolinVm;

	constructor(options: { id: string; cwd: string; current: () => GondolinVm }) {
		this.id = options.id;
		this.cwd = options.cwd;
		this.#current = options.current;
	}

	#resolve(path: string): string {
		return posix.resolve(this.cwd, path);
	}

	async #info(path: string): Promise<Result<FileInfo, FileError>> {
		const absolute = this.#resolve(path);
		try {
			const stat = await this.#current().fs.stat(absolute);
			const kind = stat.isSymbolicLink?.() ? "symlink" : stat.isDirectory() ? "directory" : "file";
			return ok({ name: posix.basename(absolute), path: absolute, kind, size: stat.size, mtimeMs: stat.mtimeMs });
		} catch (error) {
			return err(fileError(error, absolute));
		}
	}

	async absolutePath(path: string): Promise<Result<string, FileError>> {
		return ok(this.#resolve(path));
	}
	async joinPath(parts: string[]): Promise<Result<string, FileError>> {
		return ok(posix.join(...parts));
	}
	async canonicalPath(path: string): Promise<Result<string, FileError>> {
		const info = await this.#info(path);
		return info.ok ? ok(info.value.path) : info;
	}
	async exists(path: string): Promise<Result<boolean, FileError>> {
		const info = await this.#info(path);
		if (info.ok) return ok(true);
		return info.error.code === "not_found" ? ok(false) : info;
	}
	fileInfo(path: string): Promise<Result<FileInfo, FileError>> {
		return this.#info(path);
	}
	async readBinaryFile(path: string): Promise<Result<Uint8Array, FileError>> {
		const absolute = this.#resolve(path);
		try {
			return ok(new Uint8Array(await this.#current().fs.readFile(absolute)));
		} catch (error) {
			return err(fileError(error, absolute));
		}
	}
	async readTextFile(path: string): Promise<Result<string, FileError>> {
		const bytes = await this.readBinaryFile(path);
		return bytes.ok ? ok(new TextDecoder().decode(bytes.value)) : bytes;
	}
	async openBinaryReader(path: string): Promise<Result<BinaryReader, FileError>> {
		// Small demo files: read once, answer every range and line scan from memory.
		const info = await this.#info(path);
		if (!info.ok) return info;
		if (info.value.kind === "directory") return err(new FileError("is_directory", "is a directory", info.value.path));
		const bytes = await this.readBinaryFile(path);
		if (!bytes.ok) return bytes;
		const data = bytes.value;
		return ok({
			info: async () => info,
			read: async (offset, length) => ok(data.subarray(offset, offset + length)),
			scanLines: async ({ startLine, endLine }) => {
				const scanner = new LineScanner(startLine, endLine);
				scanner.push(data);
				return ok(scanner.finish());
			},
			close: async () => {},
		});
	}
	async writeFile(path: string, content: string | Uint8Array): Promise<Result<void, FileError>> {
		const absolute = this.#resolve(path);
		try {
			await this.#current().fs.mkdir(posix.dirname(absolute), { recursive: true });
			await this.#current().fs.writeFile(absolute, content);
			return ok(undefined);
		} catch (error) {
			return err(fileError(error, absolute));
		}
	}
	async createDir(path: string, options: { recursive?: boolean } | undefined): Promise<Result<void, FileError>> {
		const absolute = this.#resolve(path);
		try {
			await this.#current().fs.mkdir(absolute, { recursive: options?.recursive ?? false });
			return ok(undefined);
		} catch (error) {
			return err(fileError(error, absolute));
		}
	}

	async exec(
		command: string | readonly string[],
		options: ShellExecOptions | undefined,
		context: Context,
	): Promise<Result<ShellExecResult, ExecutionError>> {
		const argv = typeof command === "string" ? ["/bin/sh", "-lc", command] : [...command];
		const controller = new AbortController();
		const onAbort = () => controller.abort();
		context.abortSignal?.addEventListener("abort", onAbort, { once: true });
		const timer =
			options?.timeout === undefined ? undefined : setTimeout(() => controller.abort(), options.timeout * 1000);
		try {
			const process = this.#current().exec(argv, {
				cwd: options?.cwd ?? this.cwd,
				...(options?.env === undefined ? {} : { env: options.env }),
				stdout: "pipe",
				stderr: "pipe",
				signal: controller.signal,
			});
			const forward = (stream: "stdout" | "stderr") => (chunk: Buffer) =>
				options?.onOutput?.(chunk.toString("utf8"), context, { stream });
			process.stdout?.on("data", forward("stdout"));
			process.stderr?.on("data", forward("stderr"));
			const { exitCode } = await process;
			return ok({ exitCode });
		} catch (error) {
			if (controller.signal.aborted) {
				const timedOut = !context.abortSignal?.aborted;
				return err(new ExecutionError(timedOut ? "timeout" : "aborted", timedOut ? "timed out" : "aborted"));
			}
			return err(new ExecutionError("unknown", error instanceof Error ? error.message : String(error)));
		} finally {
			clearTimeout(timer);
			context.abortSignal?.removeEventListener("abort", onAbort);
		}
	}

	async cleanup(): Promise<void> {}

	// Not used by the built-in tools.
	openTextLineReader = unsupported;
	readTextLines = unsupported;
	appendFile = unsupported;
	truncateFile = unsupported;
	flushFile = unsupported;
	renameFile = unsupported;
	listDir = unsupported;
	openDirReader = unsupported;
	watch = unsupported;
	remove = unsupported;
	createTempDir = unsupported;
	createTempFile = unsupported;
}

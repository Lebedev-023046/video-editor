import ffmpegWasmUrl from "@ffmpeg/core/wasm?url";
import ffmpegCoreUrl from "@ffmpeg/core?url";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import ffmpegWorkerUrl from "@ffmpeg/ffmpeg/worker?url";

import type { MergeProgress } from "../../../../entities/video-item";

interface MergeCallbacks {
	onProgress?: (progress: MergeProgress) => void;
}

function logFfmpegDebug(message: string, details?: unknown) {
	if (details !== undefined) {
		console.info(`[ffmpeg-service] ${message}`, details);
		return;
	}

	console.info(`[ffmpeg-service] ${message}`);
}

export interface BrowserFfmpegService {
	ensureLoaded: () => Promise<void>;
	writeFile: (path: string, data: Uint8Array) => Promise<void>;
	exec: (args: string[]) => Promise<number>;
	readFile: (path: string) => Promise<Uint8Array>;
	createDir: (path: string) => Promise<void>;
	deleteFile: (path: string) => Promise<void>;
	deleteDir: (path: string) => Promise<void>;
	getLastLogs: () => string[];
}

export function createBrowserFfmpegService(
	callbacks: MergeCallbacks = {},
): BrowserFfmpegService {
	const ffmpeg = new FFmpeg();
	const logs: string[] = [];

	logFfmpegDebug("service created", {
		coreURL: ffmpegCoreUrl,
		wasmURL: ffmpegWasmUrl,
		classWorkerURL: ffmpegWorkerUrl,
	});

	ffmpeg.on("log", ({ message }) => {
		logs.push(message);
		if (logs.length > 100) {
			logs.shift();
		}

		console.info("[ffmpeg-core]", message);
	});

	ffmpeg.on("progress", ({ progress }) => {
		logFfmpegDebug("progress event", { progress });
		callbacks.onProgress?.({
			phase: "merging",
			message: "Объединение видео...",
			progress,
		});
	});

	return {
		async ensureLoaded() {
			if (ffmpeg.loaded) {
				logFfmpegDebug("load skipped, already loaded");
				return;
			}

			logFfmpegDebug("starting ffmpeg.load()");
			callbacks.onProgress?.({
				phase: "loading-ffmpeg",
				message: "Загрузка ffmpeg.wasm...",
			});

			try {
				const isFirstLoad = await ffmpeg.load({
					classWorkerURL: ffmpegWorkerUrl,
					coreURL: ffmpegCoreUrl,
					wasmURL: ffmpegWasmUrl,
				});

				logFfmpegDebug("ffmpeg.load() resolved", {
					isFirstLoad,
					loaded: ffmpeg.loaded,
				});
			} catch (error) {
				logFfmpegDebug("ffmpeg.load() failed", error);
				throw error;
			}
		},
		async writeFile(path, data) {
			logFfmpegDebug("writeFile", {
				path,
				size: data.byteLength,
			});
			await ffmpeg.writeFile(path, data);
		},
		async exec(args) {
			logFfmpegDebug("exec start", { args });
			const exitCode = await ffmpeg.exec(args);
			logFfmpegDebug("exec done", { args, exitCode });
			return exitCode;
		},
		async readFile(path) {
			logFfmpegDebug("readFile", { path });
			const data = await ffmpeg.readFile(path);

			if (typeof data === "string") {
				logFfmpegDebug("readFile returned string", {
					path,
					length: data.length,
				});
				return new TextEncoder().encode(data);
			}

			logFfmpegDebug("readFile returned binary", {
				path,
				size: data.byteLength,
			});
			return data;
		},
		async createDir(path) {
			logFfmpegDebug("createDir", { path });
			await ffmpeg.createDir(path);
		},
		async deleteFile(path) {
			try {
				logFfmpegDebug("deleteFile", { path });
				await ffmpeg.deleteFile(path);
			} catch {
				// Best-effort cleanup only.
				logFfmpegDebug("deleteFile skipped after failure", { path });
			}
		},
		async deleteDir(path) {
			try {
				logFfmpegDebug("deleteDir", { path });
				await ffmpeg.deleteDir(path);
			} catch {
				// Best-effort cleanup only.
				logFfmpegDebug("deleteDir skipped after failure", { path });
			}
		},
		getLastLogs() {
			return [...logs];
		},
	};
}

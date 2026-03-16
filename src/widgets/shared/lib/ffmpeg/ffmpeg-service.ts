import ffmpegWasmUrl from "@ffmpeg/core/wasm?url";
import ffmpegCoreUrl from "@ffmpeg/core?url";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import ffmpegWorkerUrl from "@ffmpeg/ffmpeg/worker?url";

import type { MergeProgress } from "../../../../entities/video-item";

interface MergeCallbacks {
	onProgress?: (progress: MergeProgress) => void;
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

	ffmpeg.on("log", ({ message }) => {
		logs.push(message);
		if (logs.length > 100) {
			logs.shift();
		}
	});

	ffmpeg.on("progress", ({ progress }) => {
		callbacks.onProgress?.({
			phase: "merging",
			message: "Объединение видео...",
			progress,
		});
	});

	return {
		async ensureLoaded() {
			if (ffmpeg.loaded) {
				return;
			}

			callbacks.onProgress?.({
				phase: "loading-ffmpeg",
				message: "Загрузка ffmpeg.wasm...",
			});

			await ffmpeg.load({
				classWorkerURL: ffmpegWorkerUrl,
				coreURL: ffmpegCoreUrl,
				wasmURL: ffmpegWasmUrl,
			});
		},
		async writeFile(path, data) {
			await ffmpeg.writeFile(path, data);
		},
		async exec(args) {
			return ffmpeg.exec(args);
		},
		async readFile(path) {
			const data = await ffmpeg.readFile(path);

			if (typeof data === "string") {
				return new TextEncoder().encode(data);
			}

			return data;
		},
		async createDir(path) {
			await ffmpeg.createDir(path);
		},
		async deleteFile(path) {
			try {
				await ffmpeg.deleteFile(path);
			} catch {
				// Best-effort cleanup only.
			}
		},
		async deleteDir(path) {
			try {
				await ffmpeg.deleteDir(path);
			} catch {
				// Best-effort cleanup only.
			}
		},
		getLastLogs() {
			return [...logs];
		},
	};
}

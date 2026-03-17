import ffmpegWasmUrl from "@ffmpeg/core/wasm?url";
import ffmpegCoreUrl from "@ffmpeg/core?url";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import ffmpegWorkerUrl from "@ffmpeg/ffmpeg/worker?url";
import { toBlobURL } from "@ffmpeg/util";

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

const FFMPEG_LOAD_TIMEOUT_MS = 30_000;

let ffmpegAssetUrlsPromise: Promise<{
	classWorkerURL: string;
	coreURL: string;
	wasmURL: string;
}> | null = null;

async function getFfmpegAssetUrls() {
	if (!ffmpegAssetUrlsPromise) {
		ffmpegAssetUrlsPromise = Promise.all([
			toBlobURL(ffmpegWorkerUrl, "text/javascript"),
			toBlobURL(ffmpegCoreUrl, "text/javascript"),
			toBlobURL(ffmpegWasmUrl, "application/wasm"),
		]).then(([classWorkerURL, coreURL, wasmURL]) => ({
			classWorkerURL,
			coreURL,
			wasmURL,
		}));
	}

	return ffmpegAssetUrlsPromise;
}

async function withLoadTimeout<T>(loadPromise: Promise<T>) {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	try {
		return await Promise.race([
			loadPromise,
			new Promise<never>((_, reject) => {
				timeoutId = setTimeout(() => {
					reject(
						new Error(
							"Загрузка ffmpeg.wasm заняла слишком много времени. Проверьте доступность файлов приложения и попробуйте еще раз.",
						),
					);
				}, FFMPEG_LOAD_TIMEOUT_MS);
			}),
		]);
	} finally {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
	}
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

			const { classWorkerURL, coreURL, wasmURL } = await getFfmpegAssetUrls();

			await withLoadTimeout(
				ffmpeg.load({
					classWorkerURL,
					coreURL,
					wasmURL,
				}),
			);
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

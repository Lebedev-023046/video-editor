/// <reference lib="webworker" />

import type {
	MergeErrorResult,
	MergeProgress,
	VideoItem,
} from "../../../entities/video-item";
import { buildConcatManifest, createBrowserFfmpegService } from "../lib/ffmpeg";
import {
	buildStreamCopyArgs,
	buildTranscodeArgs,
	getMergeFailureMessage,
	inferCompatibilityError,
} from "./merge-commands";

interface MergeWorkerRequest {
	type: "merge";
	payload: {
		sources: Array<{
			item: VideoItem;
			file: File;
		}>;
		outputFileName: string;
	};
}

type MergeWorkerResponse =
	| {
			type: "progress";
			payload: MergeProgress;
	  }
	| {
			type: "success";
			payload: {
				fileName: string;
				fileData: ArrayBuffer;
			};
	  }
	| {
			type: "error";
			payload: MergeErrorResult;
	  };

const workerScope = self as DedicatedWorkerGlobalScope;

function logWorkerDebug(message: string, details?: unknown) {
	if (details !== undefined) {
		console.info(`[video-merge-worker] ${message}`, details);
		return;
	}

	console.info(`[video-merge-worker] ${message}`);
}

function postMessageSafe(
	message: MergeWorkerResponse,
	transfer?: Transferable[],
) {
	logWorkerDebug("posting message", message);
	workerScope.postMessage(message, transfer ?? []);
}

function getExtension(fileName: string) {
	const match = /\.([a-z0-9]+)$/i.exec(fileName);
	return match ? `.${match[1]}` : ".mp4";
}

workerScope.onmessage = async (event: MessageEvent<MergeWorkerRequest>) => {
	const message = event.data;
	logWorkerDebug("received message", message);

	if (message.type !== "merge") {
		logWorkerDebug("ignored unknown message", message);
		return;
	}

	const { sources, outputFileName } = message.payload;
	const items = sources.map((source) => source.item);
	const ffmpeg = createBrowserFfmpegService({
		onProgress(progress) {
			postMessageSafe({
				type: "progress",
				payload: progress,
			});
		},
	});

	const workDirectory = `/merge-${Date.now()}`;
	const outputPath = `${workDirectory}/${outputFileName}`;
	const manifestPath = `${workDirectory}/concat.txt`;
	let fallbackAttempted = false;

	try {
		logWorkerDebug("merge started", {
			itemCount: items.length,
			outputFileName,
		});
		postMessageSafe({
			type: "progress",
			payload: {
				phase: "preparing",
				message: "Подготовка файлов...",
				processedItems: 0,
				totalItems: items.length,
			},
		});

		await ffmpeg.ensureLoaded();
		logWorkerDebug("ffmpeg loaded");
		await ffmpeg.createDir(workDirectory);

		const entries = [];

		for (const [index, source] of sources.entries()) {
			logWorkerDebug("loaded source record", {
				id: source.item.id,
				name: source.item.name,
				size: source.file.size,
			});

			const fileData = new Uint8Array(await source.file.arrayBuffer());
			const inputName = `input-${index}${getExtension(source.item.name)}`;
			await ffmpeg.writeFile(`${workDirectory}/${inputName}`, fileData);
			entries.push({
				inputName,
				sourceItem: source.item,
			});

			postMessageSafe({
				type: "progress",
				payload: {
					phase: "preparing",
					message: `Подготовка файлов ${index + 1}/${items.length}`,
					processedItems: index + 1,
					totalItems: items.length,
				},
			});
		}

		const manifest = buildConcatManifest(entries);
		logWorkerDebug("concat manifest built", { manifest });
		await ffmpeg.writeFile(manifestPath, new TextEncoder().encode(manifest));

		postMessageSafe({
			type: "progress",
			payload: {
				phase: "merging",
				message: "Объединение видео...",
				processedItems: items.length,
				totalItems: items.length,
				mergeStage: "copy",
			},
		});

		const exitCode = await ffmpeg.exec(
			buildStreamCopyArgs(manifestPath, outputPath),
			{
				message: "Объединение видео...",
				mergeStage: "copy",
			},
		);

		if (exitCode !== 0) {
			const copyLogs = ffmpeg.getLastLogs();
			const isCompatibilityError = inferCompatibilityError(copyLogs);
			logWorkerDebug("stream copy failed", {
				isCompatibilityError,
				logs: copyLogs,
			});

			if (!isCompatibilityError) {
				throw new Error("ffmpeg merge failed");
			}

			fallbackAttempted = true;
			postMessageSafe({
				type: "progress",
				payload: {
					phase: "merging",
					message: "Перекодирование для совместимости...",
					processedItems: items.length,
					totalItems: items.length,
					mergeStage: "transcode",
				},
			});

			const transcodeExitCode = await ffmpeg.exec(
				buildTranscodeArgs(manifestPath, outputPath),
				{
					message: "Перекодирование для совместимости...",
					mergeStage: "transcode",
				},
			);

			if (transcodeExitCode !== 0) {
				throw new Error("ffmpeg transcode merge failed");
			}
		}

		logWorkerDebug("ffmpeg merge succeeded", {
			outputPath,
		});

		postMessageSafe({
			type: "progress",
			payload: {
				phase: "finalizing",
				message: "Подготовка результата...",
			},
		});

		const outputData = await ffmpeg.readFile(outputPath);
		const arrayBuffer = outputData.slice().buffer;
		logWorkerDebug("output file read", {
			fileName: outputFileName,
			size: outputData.byteLength,
		});

		postMessageSafe(
			{
				type: "success",
				payload: {
					fileName: outputFileName,
					fileData: arrayBuffer,
				},
			},
			[arrayBuffer],
		);
	} catch (error) {
		const logs = ffmpeg.getLastLogs();
		const isCompatibilityError =
			!fallbackAttempted && inferCompatibilityError(logs);
		logWorkerDebug("merge failed", {
			error,
			logs,
			isCompatibilityError,
			fallbackAttempted,
		});
		postMessageSafe({
			type: "error",
			payload: {
				type: "error",
				code:
					isCompatibilityError || fallbackAttempted
						? "compatibility"
						: "worker",
				message:
					isCompatibilityError && !fallbackAttempted
						? "Видео не удалось объединить без перекодирования. Выполняется только безопасное объединение совместимых файлов."
						: (getMergeFailureMessage(logs, fallbackAttempted) ??
							(error instanceof Error
								? error.message
								: "Не удалось выполнить объединение видео.")),
			},
		});
	} finally {
		logWorkerDebug("cleanup started", { workDirectory });
		await ffmpeg.deleteFile(manifestPath);
		await ffmpeg.deleteFile(outputPath);
		await Promise.all(
			items.map((item, index) =>
				ffmpeg.deleteFile(
					`${workDirectory}/input-${index}${getExtension(item.name)}`,
				),
			),
		);
		await ffmpeg.deleteDir(workDirectory);
		logWorkerDebug("cleanup finished", { workDirectory });
	}
};

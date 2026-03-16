/// <reference lib="webworker" />

import type {
	MergeErrorResult,
	MergeProgress,
	VideoItem,
} from "../../../entities/video-item";
import { buildConcatManifest, createBrowserFfmpegService } from "../lib/ffmpeg";
import { createVideoFileRepository } from "../lib/indexed-db";

interface MergeWorkerRequest {
	type: "merge";
	payload: {
		items: VideoItem[];
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

function postMessageSafe(
	message: MergeWorkerResponse,
	transfer?: Transferable[],
) {
	workerScope.postMessage(message, transfer ?? []);
}

function inferCompatibilityError(logs: string[]) {
	const text = logs.join("\n").toLowerCase();

	if (
		text.includes("invalid data found") ||
		text.includes("non monotonically increasing dts") ||
		text.includes("concat") ||
		text.includes("could not find codec parameters") ||
		text.includes("incorrect codec parameters")
	) {
		return true;
	}

	return false;
}

function getExtension(fileName: string) {
	const match = /\.([a-z0-9]+)$/i.exec(fileName);
	return match ? `.${match[1]}` : ".mp4";
}

workerScope.onmessage = async (event: MessageEvent<MergeWorkerRequest>) => {
	const message = event.data;

	if (message.type !== "merge") {
		return;
	}

	const { items, outputFileName } = message.payload;
	const repository = await createVideoFileRepository();
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

	try {
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
		await ffmpeg.createDir(workDirectory);

		const entries = [];

		for (const [index, item] of items.entries()) {
			const record = await repository.get(item.id);

			if (!record) {
				throw new Error(`Не найдено сохраненное видео: ${item.name}`);
			}

			const fileData = new Uint8Array(await record.file.arrayBuffer());
			const inputName = `input-${index}${getExtension(record.item.name)}`;
			await ffmpeg.writeFile(`${workDirectory}/${inputName}`, fileData);
			entries.push({
				inputName,
				sourceItem: item,
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
		await ffmpeg.writeFile(
			`${workDirectory}/concat.txt`,
			new TextEncoder().encode(manifest),
		);

		postMessageSafe({
			type: "progress",
			payload: {
				phase: "merging",
				message: "Объединение видео...",
				processedItems: items.length,
				totalItems: items.length,
			},
		});

		const exitCode = await ffmpeg.exec([
			"-f",
			"concat",
			"-safe",
			"0",
			"-i",
			`${workDirectory}/concat.txt`,
			"-c",
			"copy",
			outputPath,
		]);

		if (exitCode !== 0) {
			throw new Error("ffmpeg merge failed");
		}

		postMessageSafe({
			type: "progress",
			payload: {
				phase: "finalizing",
				message: "Подготовка результата...",
			},
		});

		const outputData = await ffmpeg.readFile(outputPath);
		const arrayBuffer = outputData.slice().buffer;

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
		const isCompatibilityError = inferCompatibilityError(logs);
		postMessageSafe({
			type: "error",
			payload: {
				type: "error",
				code: isCompatibilityError ? "compatibility" : "worker",
				message: isCompatibilityError
					? "Видео не удалось объединить без перекодирования. Проверьте, что файлы совместимы по контейнеру и кодекам."
					: error instanceof Error
						? error.message
						: "Не удалось выполнить объединение видео.",
			},
		});
	} finally {
		await ffmpeg.deleteFile(`${workDirectory}/concat.txt`);
		await ffmpeg.deleteFile(outputPath);
		await Promise.all(
			items.map((item, index) =>
				ffmpeg.deleteFile(
					`${workDirectory}/input-${index}${getExtension(item.name)}`,
				),
			),
		);
		await ffmpeg.deleteDir(workDirectory);
	}
};

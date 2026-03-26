/// <reference lib="webworker" />

import type {
	ImageConvertWorkerRequest,
	ImageConvertWorkerResponse,
} from "../../../features/image-convert/model/image-convert-worker";
import {
	convertHeicFile,
	getFriendlyImageConvertError,
} from "../lib/image-convert";
import {
	chunkImageConvertItems,
	shouldYieldAfterChunk,
} from "./image-convert-worker-helpers";

const workerScope = self as DedicatedWorkerGlobalScope;

function postMessageSafe(
	message: ImageConvertWorkerResponse,
	transfer?: Transferable[],
) {
	workerScope.postMessage(message, transfer ?? []);
}

workerScope.onmessage = async (
	event: MessageEvent<ImageConvertWorkerRequest>,
) => {
	const message = event.data;

	if (message.type !== "convert") {
		return;
	}

	const { items, outputFormat } = message.payload;
	let successfulCount = 0;
	let failedCount = 0;

	try {
		const itemChunks = chunkImageConvertItems(items);
		let processedItems = 0;

		for (const [chunkIndex, chunk] of itemChunks.entries()) {
			for (const item of chunk) {
				postMessageSafe({
					type: "item-started",
					payload: {
						currentItemId: item.id,
						currentFileName: item.name,
						processedItems,
						totalItems: items.length,
						message: `Конвертация ${processedItems + 1}/${items.length}`,
					},
				});

				try {
					const converted = await convertHeicFile(item.file, outputFormat);
					const arrayBuffer = converted.data.slice().buffer;
					successfulCount += 1;
					postMessageSafe(
						{
							type: "item-complete",
							payload: {
								id: item.id,
								fileName: converted.fileName,
								mimeType: converted.mimeType,
								fileData: arrayBuffer,
							},
						},
						[arrayBuffer],
					);
				} catch (error) {
					failedCount += 1;
					postMessageSafe({
						type: "item-failed",
						payload: {
							id: item.id,
							errorMessage: getFriendlyImageConvertError(error),
						},
					});
				} finally {
					processedItems += 1;
				}
			}

			if (shouldYieldAfterChunk(chunkIndex, itemChunks.length)) {
				await new Promise<void>((resolve) => {
					setTimeout(resolve, 0);
				});
			}
		}

		postMessageSafe({
			type: "complete",
			payload: {
				processedItems: items.length,
				totalItems: items.length,
				successfulCount,
				failedCount,
			},
		});
	} catch {
		postMessageSafe({
			type: "error",
			payload: {
				message: "Не удалось завершить пакетную конвертацию.",
			},
		});
	}
};

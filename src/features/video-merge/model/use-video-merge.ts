import { useEffect, useMemo, useRef, useState } from "react";

import type {
	MergeErrorResult,
	MergeProgress,
	VideoItem,
} from "../../../entities/video-item";
import { getMergeProgressValue, getMergeStatusView } from "./merge-status";
import { getStreamCopyCompatibilityIssue } from "./precheck";

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

function logMergeDebug(message: string, details?: unknown) {
	if (details !== undefined) {
		console.info(`[use-video-merge] ${message}`, details);
		return;
	}

	console.info(`[use-video-merge] ${message}`);
}

function getMergedFileName(items: VideoItem[]) {
	const firstFile = items[0];
	const baseName = firstFile?.name.replace(/\.[^/.]+$/, "") || "merged-video";
	return `${baseName}-merged.mp4`;
}

export function useVideoMerge(items: VideoItem[]) {
	const workerRef = useRef<Worker | null>(null);
	const lastItemsSignatureRef = useRef<string | null>(null);
	const [progress, setProgress] = useState<MergeProgress | null>(null);
	const [isMerging, setIsMerging] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [resultFile, setResultFile] = useState<File | null>(null);

	const precheckIssue = useMemo(
		() => getStreamCopyCompatibilityIssue(items),
		[items],
	);
	const itemsSignature = useMemo(
		() => items.map((item) => `${item.id}:${item.order}`).join("|"),
		[items],
	);

	useEffect(() => {
		if (lastItemsSignatureRef.current === null) {
			lastItemsSignatureRef.current = itemsSignature;
			return;
		}

		if (lastItemsSignatureRef.current !== itemsSignature) {
			logMergeDebug("items changed, clearing previous merge result", {
				previous: lastItemsSignatureRef.current,
				next: itemsSignature,
			});
			setResultFile(null);
		}

		lastItemsSignatureRef.current = itemsSignature;
	}, [itemsSignature]);

	useEffect(() => {
		logMergeDebug("creating merge worker");
		const worker = new Worker(
			new URL(
				"../../../widgets/shared/workers/video-merge.worker.ts",
				import.meta.url,
			),
			{ type: "module" },
		);

		worker.onmessage = (event: MessageEvent<MergeWorkerResponse>) => {
			const message = event.data;
			logMergeDebug("worker message received", message);

			if (message.type === "progress") {
				setProgress((currentProgress) => {
					if (!currentProgress) {
						return message.payload;
					}

					const nextProgressValue = getMergeProgressValue(message.payload);
					const currentProgressValue = getMergeProgressValue(currentProgress);

					if (
						typeof nextProgressValue === "number" &&
						typeof currentProgressValue === "number" &&
						nextProgressValue < currentProgressValue
					) {
						logMergeDebug("ignoring regressive progress update", {
							currentProgress,
							incomingProgress: message.payload,
							currentProgressValue,
							nextProgressValue,
						});
						return currentProgress;
					}

					return message.payload;
				});
				setIsMerging(true);
				setErrorMessage(null);
				return;
			}

			if (message.type === "success") {
				setIsMerging(false);
				setErrorMessage(null);
				setProgress(null);
				setResultFile(
					new File([message.payload.fileData], message.payload.fileName, {
						type: "video/mp4",
					}),
				);
				return;
			}

			if (message.type === "error") {
				setIsMerging(false);
				setProgress(null);
				setErrorMessage(message.payload.message);
			}
		};

		worker.onerror = (event) => {
			logMergeDebug("worker error event", {
				message: event.message,
				filename: event.filename,
				lineno: event.lineno,
				colno: event.colno,
			});
		};

		worker.onmessageerror = (event) => {
			logMergeDebug("worker message error", event);
		};

		workerRef.current = worker;

		return () => {
			logMergeDebug("terminating merge worker");
			worker.terminate();
			workerRef.current = null;
		};
	}, []);

	const canMerge = items.length >= 2 && !isMerging && !precheckIssue;

	const status = useMemo(
		() =>
			getMergeStatusView(
				progress,
				isMerging,
				errorMessage,
				Boolean(resultFile),
				items.length >= 2 && !precheckIssue,
			),
		[
			errorMessage,
			isMerging,
			items.length,
			precheckIssue,
			progress,
			resultFile,
		],
	);

	function startMerge() {
		if (!workerRef.current || items.length < 2 || isMerging) {
			logMergeDebug("startMerge skipped", {
				hasWorker: Boolean(workerRef.current),
				itemCount: items.length,
				isMerging,
			});
			return;
		}

		if (precheckIssue) {
			logMergeDebug("startMerge blocked by precheck", { precheckIssue });
			setErrorMessage(precheckIssue);
			return;
		}

		setErrorMessage(null);
		setResultFile(null);
		setProgress({
			phase: "preparing",
			message: "Подготовка файлов...",
			processedItems: 0,
			totalItems: items.length,
		});
		setIsMerging(true);

		const request: MergeWorkerRequest = {
			type: "merge",
			payload: {
				items,
				outputFileName: getMergedFileName(items),
			},
		};

		logMergeDebug("posting merge request", request);
		workerRef.current.postMessage(request);
	}

	return {
		canMerge,
		isMerging,
		progress,
		errorMessage,
		precheckIssue,
		resultFile,
		status,
		startMerge,
	};
}

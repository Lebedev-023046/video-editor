import { useEffect, useMemo, useRef, useState } from "react";

import type {
    MergeErrorResult,
    MergeProgress,
    VideoItem,
} from "../../../entities/video-item";
import { getMergeStatusView } from "./merge-status";

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

function getMergedFileName(items: VideoItem[]) {
	const firstFile = items[0];
	const baseName = firstFile?.name.replace(/\.[^/.]+$/, "") || "merged-video";
	return `${baseName}-merged.mp4`;
}

export function useVideoMerge(items: VideoItem[]) {
	const workerRef = useRef<Worker | null>(null);
	const [progress, setProgress] = useState<MergeProgress | null>(null);
	const [isMerging, setIsMerging] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [resultFile, setResultFile] = useState<File | null>(null);

	useEffect(() => {
		const worker = new Worker(
			new URL("../../../widgets/shared/workers/video-merge.worker.ts", import.meta.url),
			{ type: "module" },
		);

		worker.onmessage = (event: MessageEvent<MergeWorkerResponse>) => {
			const message = event.data;

			if (message.type === "progress") {
				setProgress(message.payload);
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

		workerRef.current = worker;

		return () => {
			worker.terminate();
			workerRef.current = null;
		};
	}, []);

	const canMerge = items.length >= 2 && !isMerging;

	const status = useMemo(
		() =>
			getMergeStatusView(
				progress,
				isMerging,
				errorMessage,
				Boolean(resultFile),
				items.length >= 2,
			),
		[errorMessage, isMerging, items.length, progress, resultFile],
	);

	function startMerge() {
		if (!workerRef.current || items.length < 2 || isMerging) {
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

		workerRef.current.postMessage(request);
	}

	return {
		canMerge,
		isMerging,
		progress,
		errorMessage,
		resultFile,
		status,
		startMerge,
	};
}

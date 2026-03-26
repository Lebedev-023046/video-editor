import { useEffect, useMemo, useRef, useState } from "react";

import { createZipArchive } from "../../../widgets/shared/lib/archive";
import { IMAGE_CONVERT_ARCHIVE_BUILD_DELAY_MS } from "../../../widgets/shared/workers/image-convert-worker-helpers";
import type {
	ImageConvertArchiveState,
	ImageConvertIssue,
	ImageConvertItem,
	ImageConvertSessionCounts,
	ImageConvertSessionState,
	ImageOutputFormat,
} from "./image-convert-types";
import { validateImageConvertFiles } from "./image-convert-validation";
import type {
	ImageConvertWorkerRequest,
	ImageConvertWorkerResponse,
} from "./image-convert-worker";

interface UseImageConvertResult extends ImageConvertSessionState {
	addFiles: (files: FileList | File[]) => Promise<void>;
	clearSession: () => void;
	setOutputFormat: (format: ImageOutputFormat) => void;
	startConversion: () => void;
	rerunFailedItems: () => void;
}

function createSessionId() {
	return `image-session-${Date.now()}`;
}

function createArchiveState(
	successfulCount = 0,
	file: File | null = null,
	failedCount = 0,
): ImageConvertArchiveState {
	return {
		isReady: successfulCount > 0,
		fileName: file?.name ?? null,
		file,
		successfulCount,
		failedCount,
	};
}

function createItemId(file: File, sessionOrder: number) {
	return `${file.name}-${file.size}-${sessionOrder}`;
}

function createCounts(items: ImageConvertItem[]): ImageConvertSessionCounts {
	return items.reduce<ImageConvertSessionCounts>(
		(counts, item) => {
			counts.total += 1;
			counts[item.status] += 1;
			return counts;
		},
		{
			total: 0,
			queued: 0,
			converting: 0,
			done: 0,
			failed: 0,
		},
	);
}

function createArchiveFileName(
	outputFormat: ImageOutputFormat,
	sessionId: string,
) {
	return `image-convert-${outputFormat}-${sessionId}.zip`;
}

export function useImageConvert(): UseImageConvertResult {
	const workerRef = useRef<Worker | null>(null);
	const successfulOutputsRef = useRef(
		new Map<string, { fileName: string; data: Uint8Array }>(),
	);
	const [sessionId, setSessionId] = useState(() => createSessionId());
	const [outputFormat, setOutputFormat] = useState<ImageOutputFormat>("png");
	const [items, setItems] = useState<ImageConvertItem[]>([]);
	const [issues, setIssues] = useState<ImageConvertIssue[]>([]);
	const [isAddingFiles, setIsAddingFiles] = useState(false);
	const [isConverting, setIsConverting] = useState(false);
	const [progress, setProgress] =
		useState<UseImageConvertResult["progress"]>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [archiveFile, setArchiveFile] = useState<File | null>(null);

	const counts = useMemo(() => createCounts(items), [items]);
	const archive = useMemo(
		() => createArchiveState(counts.done, archiveFile, counts.failed),
		[counts.done, archiveFile, counts.failed],
	);

	useEffect(() => {
		if (typeof Worker === "undefined") {
			return;
		}

		const worker = new Worker(
			new URL(
				"../../../widgets/shared/workers/image-convert.worker.ts",
				import.meta.url,
			),
			{ type: "module" },
		);

		worker.onmessage = (event: MessageEvent<ImageConvertWorkerResponse>) => {
			const message = event.data;

			if (message.type === "item-started") {
				setProgress({
					processedItems: message.payload.processedItems,
					totalItems: message.payload.totalItems,
					currentFileName: message.payload.currentFileName,
					message: message.payload.message,
				});
				setItems((currentItems) =>
					currentItems.map((item) =>
						item.id === message.payload.currentItemId &&
						item.status === "queued"
							? { ...item, status: "converting" }
							: item,
					),
				);
				return;
			}

			if (message.type === "item-complete") {
				successfulOutputsRef.current.set(message.payload.id, {
					fileName: message.payload.fileName,
					data: new Uint8Array(message.payload.fileData),
				});
				setItems((currentItems) =>
					currentItems.map((item) =>
						item.id === message.payload.id
							? {
									...item,
									status: "done",
									errorMessage: null,
									outputFileName: message.payload.fileName,
									outputMimeType: message.payload.mimeType,
									outputFile: null,
								}
							: item,
					),
				);
				return;
			}

			if (message.type === "item-failed") {
				successfulOutputsRef.current.delete(message.payload.id);
				setItems((currentItems) =>
					currentItems.map((item) =>
						item.id === message.payload.id
							? {
									...item,
									status: "failed",
									errorMessage: message.payload.errorMessage,
								}
							: item,
					),
				);
				return;
			}

			if (message.type === "complete") {
				setIsConverting(false);
				setProgress({
					processedItems: message.payload.processedItems,
					totalItems: message.payload.totalItems,
					currentFileName: null,
					message:
						message.payload.failedCount > 0
							? "Конвертация завершена с ошибками."
							: "Конвертация завершена.",
				});
				return;
			}

			if (message.type === "error") {
				setIsConverting(false);
				setErrorMessage(message.payload.message);
				setProgress(null);
			}
		};

		workerRef.current = worker;

		return () => {
			worker.terminate();
			workerRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (isConverting) {
			return;
		}

		const successfulOutputs = Array.from(successfulOutputsRef.current.values());

		if (successfulOutputs.length === 0) {
			setArchiveFile(null);
			return;
		}

		let cancelled = false;
		const timeoutId = window.setTimeout(() => {
			const files = successfulOutputs.map((entry) => ({
				fileName: entry.fileName,
				data: entry.data,
			}));

			if (cancelled) {
				return;
			}

			setArchiveFile(
				createZipArchive(files, createArchiveFileName(outputFormat, sessionId)),
			);
		}, IMAGE_CONVERT_ARCHIVE_BUILD_DELAY_MS);

		return () => {
			cancelled = true;
			window.clearTimeout(timeoutId);
		};
	}, [counts.done, isConverting, outputFormat, sessionId]);

	async function addFiles(files: FileList | File[]) {
		const incomingFiles = Array.from(files);
		setIsAddingFiles(true);

		try {
			const validation = validateImageConvertFiles(incomingFiles, items.length);
			setErrorMessage(validation.message);
			const nextItems = validation.acceptedFiles.map((file, index) => {
				const sessionOrder = items.length + index;

				return {
					id: createItemId(file, sessionOrder),
					name: file.name,
					size: file.size,
					mimeType: file.type,
					file,
					status: "queued" as const,
					errorMessage: null,
					outputFileName: null,
					outputMimeType: null,
					outputFile: null,
					sessionOrder,
				};
			});

			setIssues(validation.issues);

			if (nextItems.length === 0) {
				return;
			}

			setItems((currentItems) => [...currentItems, ...nextItems]);
		} finally {
			setIsAddingFiles(false);
		}
	}

	function clearSession() {
		successfulOutputsRef.current.clear();
		setSessionId(createSessionId());
		setOutputFormat("png");
		setItems([]);
		setIssues([]);
		setIsAddingFiles(false);
		setIsConverting(false);
		setProgress(null);
		setErrorMessage(null);
		setArchiveFile(null);
	}

	function startConversion() {
		const queuedItems = items.filter((item) => item.status === "queued");
		if (!workerRef.current || isConverting || queuedItems.length === 0) {
			return;
		}

		setErrorMessage(null);
		setIsConverting(true);
		setProgress({
			processedItems: 0,
			totalItems: queuedItems.length,
			currentFileName: null,
			message: "Подготовка конвертации...",
		});

		const request: ImageConvertWorkerRequest = {
			type: "convert",
			payload: {
				sessionId,
				outputFormat,
				items: queuedItems.map((item) => ({
					id: item.id,
					name: item.name,
					file: item.file,
				})),
			},
		};

		workerRef.current.postMessage(request);
	}

	function rerunFailedItems() {
		if (isConverting) {
			return;
		}

		setItems((currentItems) =>
			currentItems.map((item) =>
				item.status === "failed"
					? {
							...item,
							status: "queued",
							errorMessage: null,
						}
					: item,
			),
		);
		setErrorMessage(null);
		setProgress(null);
	}

	return {
		sessionId,
		outputFormat,
		items,
		counts,
		issues,
		isAddingFiles,
		isConverting,
		progress,
		errorMessage,
		archive,
		addFiles,
		clearSession,
		setOutputFormat,
		startConversion,
		rerunFailedItems,
	};
}

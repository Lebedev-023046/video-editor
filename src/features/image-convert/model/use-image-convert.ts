import { useMemo, useState } from "react";

import type {
    ImageConvertArchiveState,
    ImageConvertIssue,
    ImageConvertItem,
    ImageConvertSessionCounts,
    ImageConvertSessionState,
    ImageOutputFormat,
} from "./image-convert-types";
import { validateImageConvertFiles } from "./image-convert-validation";

interface UseImageConvertResult extends ImageConvertSessionState {
	addFiles: (files: FileList | File[]) => Promise<void>;
	clearSession: () => void;
	setOutputFormat: (format: ImageOutputFormat) => void;
}

function createSessionId() {
	return `image-session-${Date.now()}`;
}

function createArchiveState(successfulCount = 0): ImageConvertArchiveState {
	return {
		isReady: successfulCount > 0,
		fileName: null,
		successfulCount,
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

export function useImageConvert(): UseImageConvertResult {
	const [sessionId, setSessionId] = useState(() => createSessionId());
	const [outputFormat, setOutputFormat] = useState<ImageOutputFormat>("png");
	const [items, setItems] = useState<ImageConvertItem[]>([]);
	const [issues, setIssues] = useState<ImageConvertIssue[]>([]);
	const [isAddingFiles, setIsAddingFiles] = useState(false);

	const counts = useMemo(() => createCounts(items), [items]);
	const archive = useMemo(() => createArchiveState(counts.done), [counts.done]);

	async function addFiles(files: FileList | File[]) {
		const incomingFiles = Array.from(files);
		setIsAddingFiles(true);

		try {
			const validation = validateImageConvertFiles(incomingFiles, items.length);
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
		setSessionId(createSessionId());
		setOutputFormat("png");
		setItems([]);
		setIssues([]);
		setIsAddingFiles(false);
	}

	return {
		sessionId,
		outputFormat,
		items,
		counts,
		issues,
		isAddingFiles,
		archive,
		addFiles,
		clearSession,
		setOutputFormat,
	};
}

export type ImageOutputFormat = "png" | "jpg";

export type ImageConvertFileStatus =
	| "queued"
	| "converting"
	| "done"
	| "failed";

export interface ImageConvertIssue {
	fileName: string;
	reason: string;
}

export interface ImageConvertArchiveState {
	isReady: boolean;
	fileName: string | null;
	file: File | null;
	successfulCount: number;
	failedCount: number;
}

export interface ImageConvertItem {
	id: string;
	name: string;
	size: number;
	mimeType: string;
	file: File;
	status: ImageConvertFileStatus;
	errorMessage: string | null;
	outputFileName: string | null;
	outputMimeType: string | null;
	outputFile: File | null;
	sessionOrder: number;
}

export interface ImageConvertSessionCounts {
	total: number;
	queued: number;
	converting: number;
	done: number;
	failed: number;
}

export interface ImageConvertSessionState {
	sessionId: string;
	outputFormat: ImageOutputFormat;
	items: ImageConvertItem[];
	counts: ImageConvertSessionCounts;
	issues: ImageConvertIssue[];
	isAddingFiles: boolean;
	isConverting: boolean;
	progress: {
		processedItems: number;
		totalItems: number;
		currentFileName: string | null;
		message: string;
	} | null;
	errorMessage: string | null;
	archive: ImageConvertArchiveState;
}

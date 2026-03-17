export interface TimeRange {
	startMs: number;
	endMs: number;
}

export interface VideoItemDraftEdit {
	cutRange?: TimeRange | null;
}

export interface VideoItem {
	id: string;
	name: string;
	mimeType: string;
	size: number;
	durationMs?: number;
	thumbnailUrl?: string;
	persistedAt: string;
	storageKey: string;
	order: number;
	draftEdit?: VideoItemDraftEdit;
}

export interface PersistedVideoRecord {
	item: VideoItem;
	file: Blob;
}

export interface MergeRequest {
	items: VideoItem[];
	outputFileName: string;
}

export interface MergeProgress {
	phase: "preparing" | "loading-ffmpeg" | "merging" | "finalizing";
	message: string;
	progress?: number;
	processedItems?: number;
	totalItems?: number;
	mergeStage?: "copy" | "transcode";
}

export interface MergeSuccessResult {
	type: "success";
	fileName: string;
	file: File;
}

export interface MergeErrorResult {
	type: "error";
	code: "compatibility" | "storage" | "worker" | "unknown";
	message: string;
}

export type MergeResult = MergeSuccessResult | MergeErrorResult;

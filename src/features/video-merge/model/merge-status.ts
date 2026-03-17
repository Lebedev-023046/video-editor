import type { MergeProgress } from "../../../entities/video-item";

export type MergeViewState =
	| {
			type: "idle";
			label: string;
	  }
	| {
			type: "processing";
			label: string;
			progress?: number;
			processedItems?: number;
			totalItems?: number;
	  }
	| {
			type: "success";
			label: string;
	  }
	| {
			type: "error";
			label: string;
	  };

export function getMergeStatusView(
	progress: MergeProgress | null,
	isMerging: boolean,
	errorMessage: string | null,
	hasResult: boolean,
	canMerge: boolean,
): MergeViewState {
	if (errorMessage) {
		return {
			type: "error",
			label: errorMessage,
		};
	}

	if (isMerging && progress) {
		const normalizedProgress = getMergeProgressValue(progress);

		return {
			type: "processing",
			label: progress.message,
			progress: normalizedProgress,
			processedItems: progress.processedItems,
			totalItems: progress.totalItems,
		};
	}

	if (isMerging) {
		return {
			type: "processing",
			label: "Обработка...",
		};
	}

	if (hasResult) {
		return {
			type: "success",
			label: "",
		};
	}

	if (!canMerge) {
		return {
			type: "idle",
			label: "Нужно минимум 2 видео",
		};
	}

	return {
		type: "idle",
		label: "Можно объединять",
	};
}

export function getMergeProgressValue(progress: MergeProgress) {
	if (progress.phase === "finalizing") {
		return 1;
	}

	if (progress.phase === "loading-ffmpeg") {
		return 0.05;
	}

	if (progress.phase === "preparing") {
		const itemProgress =
			typeof progress.processedItems === "number" &&
			typeof progress.totalItems === "number" &&
			progress.totalItems > 0
				? progress.processedItems / progress.totalItems
				: 0;

		return itemProgress * 0.3;
	}

	if (progress.phase === "merging") {
		const ffmpegProgress =
			typeof progress.progress === "number" ? progress.progress : 0;
		if (progress.mergeStage === "transcode") {
			return 0.6 + ffmpegProgress * 0.35;
		}

		return 0.3 + ffmpegProgress * 0.3;
	}

	return undefined;
}

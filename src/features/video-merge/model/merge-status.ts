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
		return {
			type: "processing",
			label: progress.message,
			progress: progress.progress,
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

import type { ImageOutputFormat } from "./image-convert-types";

export interface ImageConvertWorkerItem {
	id: string;
	name: string;
	file: File;
}

export interface ImageConvertWorkerRequest {
	type: "convert";
	payload: {
		sessionId: string;
		outputFormat: ImageOutputFormat;
		items: ImageConvertWorkerItem[];
	};
}

export type ImageConvertWorkerResponse =
	| {
			type: "item-started";
			payload: {
				currentItemId: string;
				currentFileName: string;
				processedItems: number;
				totalItems: number;
				message: string;
			};
	  }
	| {
			type: "item-complete";
			payload: {
				id: string;
				fileName: string;
				mimeType: string;
				fileData: ArrayBuffer;
			};
	  }
	| {
			type: "item-failed";
			payload: {
				id: string;
				errorMessage: string;
			};
	  }
	| {
			type: "complete";
			payload: {
				processedItems: number;
				totalItems: number;
				successfulCount: number;
				failedCount: number;
			};
	  }
	| {
			type: "error";
			payload: {
				message: string;
			};
	  };

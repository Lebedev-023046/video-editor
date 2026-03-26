import type { ImageConvertIssue } from "./image-convert-types";

export const MAX_IMAGE_CONVERT_FILES = 5000;
export const EMPTY_IMAGE_SELECTION_MESSAGE = "Выберите хотя бы один HEIC-файл.";

const HEIC_EXTENSION_PATTERN = /\.(heic|heif)$/i;
const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"]);

function isHeicFile(file: File) {
	return (
		HEIC_MIME_TYPES.has(file.type.toLowerCase()) ||
		HEIC_EXTENSION_PATTERN.test(file.name)
	);
}

export function createUnsupportedImageIssue(file: File): ImageConvertIssue {
	return {
		fileName: file.name,
		reason: "Поддерживаются только HEIC-изображения.",
	};
}

export function createFileLimitIssue(file: File): ImageConvertIssue {
	return {
		fileName: file.name,
		reason: `Превышен лимит сессии: максимум ${MAX_IMAGE_CONVERT_FILES} файлов.`,
	};
}

export function validateImageConvertFiles(files: File[], currentCount: number) {
	if (files.length === 0) {
		return {
			acceptedFiles: [],
			issues: [],
			message: EMPTY_IMAGE_SELECTION_MESSAGE,
		};
	}

	const acceptedFiles: File[] = [];
	const issues: ImageConvertIssue[] = [];
	let remainingSlots = Math.max(0, MAX_IMAGE_CONVERT_FILES - currentCount);

	for (const file of files) {
		if (!isHeicFile(file)) {
			issues.push(createUnsupportedImageIssue(file));
			continue;
		}

		if (remainingSlots <= 0) {
			issues.push(createFileLimitIssue(file));
			continue;
		}

		acceptedFiles.push(file);
		remainingSlots -= 1;
	}

	return {
		acceptedFiles,
		issues,
		message: null,
	};
}

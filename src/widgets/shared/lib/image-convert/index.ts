import { heicTo } from "heic-to/next";

import type { ImageOutputFormat } from "../../../../features/image-convert/model/image-convert-types";

export function getImageOutputMimeType(format: ImageOutputFormat) {
	return format === "jpg" ? "image/jpeg" : "image/png";
}

export function getImageOutputExtension(format: ImageOutputFormat) {
	return format;
}

export function buildConvertedFileName(
	originalFileName: string,
	format: ImageOutputFormat,
) {
	const baseName =
		originalFileName.replace(/\.[^/.]+$/u, "") || "converted-image";
	return `${baseName}.${getImageOutputExtension(format)}`;
}

export function getFriendlyImageConvertError(error: unknown) {
	if (error instanceof Error) {
		const lowerMessage = error.message.toLowerCase();
		if (
			lowerMessage.includes("decode") ||
			lowerMessage.includes("heic") ||
			lowerMessage.includes("heif")
		) {
			return "Изображение не удалось прочитать.";
		}
	}

	return "Не удалось конвертировать изображение.";
}

export async function convertHeicFile(
	file: File,
	format: ImageOutputFormat,
): Promise<{
	fileName: string;
	mimeType: string;
	data: Uint8Array;
}> {
	const mimeType = getImageOutputMimeType(format);
	const convertedBlob = await heicTo({
		blob: file,
		type: mimeType,
		quality: format === "jpg" ? 0.92 : undefined,
	});
	const arrayBuffer =
		typeof (convertedBlob as Blob & { arrayBuffer?: unknown }).arrayBuffer ===
		"function"
			? await convertedBlob.arrayBuffer()
			: await new Response(convertedBlob).arrayBuffer();

	return {
		fileName: buildConvertedFileName(file.name, format),
		mimeType,
		data: new Uint8Array(arrayBuffer),
	};
}

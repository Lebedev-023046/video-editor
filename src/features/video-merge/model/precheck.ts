import type { VideoItem } from "../../../entities/video-item";

function getFileExtension(fileName: string) {
	const match = /\.([a-z0-9]+)$/i.exec(fileName);
	return match ? match[1].toLowerCase() : "";
}

export function getStreamCopyCompatibilityIssue(items: VideoItem[]) {
	if (items.length < 2) {
		return null;
	}

	const extensions = new Set(items.map((item) => getFileExtension(item.name)));
	if (extensions.size > 1) {
		return "Для надежного объединения без перекодирования используйте файлы одного формата.";
	}

	const mimeTypes = new Set(items.map((item) => item.mimeType).filter(Boolean));
	if (mimeTypes.size > 1) {
		return "Файлы выглядят как разные типы видео. Для stream copy лучше использовать одинаковые источники.";
	}

	return null;
}

export const IMAGE_CONVERT_CHUNK_SIZE = 8;
export const IMAGE_CONVERT_ARCHIVE_BUILD_DELAY_MS = 150;

export function chunkImageConvertItems<T>(
	items: T[],
	chunkSize = IMAGE_CONVERT_CHUNK_SIZE,
) {
	if (chunkSize <= 0) {
		return [items];
	}

	const chunks: T[][] = [];

	for (let index = 0; index < items.length; index += chunkSize) {
		chunks.push(items.slice(index, index + chunkSize));
	}

	return chunks;
}

export function shouldYieldAfterChunk(
	chunkIndex: number,
	totalChunks: number,
) {
	return totalChunks > 1 && chunkIndex < totalChunks - 1;
}

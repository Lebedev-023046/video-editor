export function createObjectUrl(file: Blob) {
	return URL.createObjectURL(file);
}

export function revokeObjectUrl(url: string | null) {
	if (url) {
		URL.revokeObjectURL(url);
	}
}

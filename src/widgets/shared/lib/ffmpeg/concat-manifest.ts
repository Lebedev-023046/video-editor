import type { VideoItem } from "../../../../entities/video-item";

function escapeConcatPath(path: string) {
	return path.replace(/'/g, "'\\''");
}

export interface ConcatManifestEntry {
	inputName: string;
	sourceItem: VideoItem;
}

export function buildConcatManifest(entries: ConcatManifestEntry[]) {
	return entries
		.map((entry) => `file '${escapeConcatPath(entry.inputName)}'`)
		.join("\n");
}

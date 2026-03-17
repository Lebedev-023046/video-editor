import type {
    PersistedVideoRecord,
    VideoItem,
} from "../../../../entities/video-item";

export interface VideoFileRepository {
	save(record: PersistedVideoRecord): Promise<void>;
	get(id: string): Promise<PersistedVideoRecord | undefined>;
	getAll(): Promise<PersistedVideoRecord[]>;
	delete(id: string): Promise<void>;
	clear(): Promise<void>;
}

const videoStore = new Map<string, PersistedVideoRecord>();

export async function createVideoFileRepository(): Promise<VideoFileRepository> {
	return {
		async save(record) {
			videoStore.set(record.item.id, record);
		},
		async get(id) {
			return videoStore.get(id);
		},
		async getAll() {
			return Array.from(videoStore.values()).sort(compareVideoRecords);
		},
		async delete(id) {
			videoStore.delete(id);
		},
		async clear() {
			videoStore.clear();
		},
	};
}

function compareVideoRecords(
	left: PersistedVideoRecord,
	right: PersistedVideoRecord,
) {
	return left.item.order - right.item.order;
}

export function createVideoItemFromFile(file: File, order: number): VideoItem {
	return {
		id: crypto.randomUUID(),
		name: file.name,
		mimeType: file.type || "application/octet-stream",
		size: file.size,
		persistedAt: new Date().toISOString(),
		storageKey: file.name,
		order,
	};
}

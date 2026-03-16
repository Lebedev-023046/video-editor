import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type {
	PersistedVideoRecord,
	VideoItem,
} from "../../../../entities/video-item";

const DATABASE_NAME = "minimal-browser-video-editor";
const DATABASE_VERSION = 1;
const VIDEO_STORE = "videos";

interface VideoDatabaseSchema extends DBSchema {
	[VIDEO_STORE]: {
		key: string;
		value: PersistedVideoRecord;
	};
}

export interface VideoFileRepository {
	save(record: PersistedVideoRecord): Promise<void>;
	get(id: string): Promise<PersistedVideoRecord | undefined>;
	getAll(): Promise<PersistedVideoRecord[]>;
	delete(id: string): Promise<void>;
	clear(): Promise<void>;
}

let databasePromise: Promise<IDBPDatabase<VideoDatabaseSchema>> | null = null;

async function getDatabase() {
	if (!databasePromise) {
		databasePromise = openDB<VideoDatabaseSchema>(
			DATABASE_NAME,
			DATABASE_VERSION,
			{
				upgrade(database) {
					if (!database.objectStoreNames.contains(VIDEO_STORE)) {
						database.createObjectStore(VIDEO_STORE, {
							keyPath: "item.id",
						});
					}
				},
			},
		);
	}

	return databasePromise;
}

export async function createVideoFileRepository(): Promise<VideoFileRepository> {
	const database = await getDatabase();

	return {
		async save(record) {
			await database.put(VIDEO_STORE, record);
		},
		async get(id) {
			return database.get(VIDEO_STORE, id);
		},
		async getAll() {
			const records = await database.getAll(VIDEO_STORE);

			return records.sort(compareVideoRecords);
		},
		async delete(id) {
			await database.delete(VIDEO_STORE, id);
		},
		async clear() {
			await database.clear(VIDEO_STORE);
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

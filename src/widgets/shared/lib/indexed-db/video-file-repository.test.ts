import { beforeEach, describe, expect, it, vi } from "vitest";

type PersistedRecord = {
	item: {
		id: string;
		order: number;
	};
	file: Blob;
};

type MockDatabase = {
	objectStoreNames: {
		contains: (storeName: string) => boolean;
	};
	createObjectStore: ReturnType<typeof vi.fn>;
	put: ReturnType<typeof vi.fn>;
	get: ReturnType<typeof vi.fn>;
	getAll: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	clear: ReturnType<typeof vi.fn>;
};

const databaseStore = new Map<string, PersistedRecord>();
let storeCreated = false;

function createMockDatabase(): MockDatabase {
	return {
		objectStoreNames: {
			contains: () => storeCreated,
		},
		createObjectStore: vi.fn(() => {
			storeCreated = true;
		}),
		put: vi.fn(async (_storeName: string, record: PersistedRecord) => {
			databaseStore.set(record.item.id, record);
		}),
		get: vi.fn(async (_storeName: string, id: string) => databaseStore.get(id)),
		getAll: vi.fn(async () => Array.from(databaseStore.values())),
		delete: vi.fn(async (_storeName: string, id: string) => {
			databaseStore.delete(id);
		}),
		clear: vi.fn(async () => {
			databaseStore.clear();
		}),
	};
}

const openDBMock = vi.fn(
	async (
		_name: string,
		_version: number,
		options?: { upgrade?: (database: MockDatabase) => void },
	) => {
		const database = createMockDatabase();
		options?.upgrade?.(database);
		return database;
	},
);

vi.mock("idb", () => ({
	openDB: openDBMock,
}));

function createRecord(id: string, order: number) {
	return {
		item: {
			id,
			name: `${id}.mp4`,
			mimeType: "video/mp4",
			size: 1024,
			persistedAt: "2026-03-17T10:00:00.000Z",
			storageKey: `${id}.mp4`,
			order,
		},
		file: new Blob([id], { type: "video/mp4" }),
	};
}

describe("video file repository", () => {
	beforeEach(() => {
		databaseStore.clear();
		storeCreated = false;
		openDBMock.mockClear();
	});

	it("saves, loads, deletes, and clears records", async () => {
		vi.resetModules();
		const { createVideoFileRepository } =
			await import("./video-file-repository");
		const repository = await createVideoFileRepository();
		const firstRecord = createRecord("first", 1);
		const secondRecord = createRecord("second", 0);

		await repository.save(firstRecord);
		await repository.save(secondRecord);

		expect((await repository.getAll()).map((record) => record.item.id)).toEqual(
			["second", "first"],
		);
		expect((await repository.get("first"))?.item.id).toBe("first");

		await repository.delete("first");
		expect(await repository.get("first")).toBeUndefined();

		await repository.clear();
		expect(await repository.getAll()).toEqual([]);
	});

	it("creates the object store once and reuses the database promise", async () => {
		vi.resetModules();
		const { createVideoFileRepository } =
			await import("./video-file-repository");

		await createVideoFileRepository();
		await createVideoFileRepository();

		expect(openDBMock).toHaveBeenCalledTimes(1);
	});

	it("builds a persisted item from a file", async () => {
		vi.resetModules();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-17T12:00:00.000Z"));
		const randomUuidSpy = vi
			.spyOn(crypto, "randomUUID")
			.mockReturnValue("00000000-0000-0000-0000-000000000000");
		const { createVideoItemFromFile } = await import("./video-file-repository");

		const item = createVideoItemFromFile(
			new File(["video"], "clip.mp4", { type: "video/mp4" }),
			3,
		);

		expect(item).toMatchObject({
			id: "00000000-0000-0000-0000-000000000000",
			name: "clip.mp4",
			mimeType: "video/mp4",
			size: 5,
			order: 3,
			storageKey: "clip.mp4",
			persistedAt: "2026-03-17T12:00:00.000Z",
		});

		randomUuidSpy.mockRestore();
		vi.useRealTimers();
	});
});

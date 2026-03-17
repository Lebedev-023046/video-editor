import { beforeEach, describe, expect, it, vi } from "vitest";

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
	beforeEach(async () => {
		vi.resetModules();
		const { createVideoFileRepository } = await import("./video-file-repository");
		const repository = await createVideoFileRepository();
		await repository.clear();
	});

	it("stores records in memory for the current session", async () => {
		const { createVideoFileRepository } = await import("./video-file-repository");
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

	it("shares in-memory records across repository instances in the same tab", async () => {
		const { createVideoFileRepository } = await import("./video-file-repository");
		const firstRepository = await createVideoFileRepository();
		const secondRepository = await createVideoFileRepository();

		await firstRepository.save(createRecord("shared", 0));

		expect((await secondRepository.get("shared"))?.item.id).toBe("shared");
	});

	it("builds a video item from a file", async () => {
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

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PersistedVideoRecord, VideoItem } from "../../../entities/video-item";

const createVideoFileRepositoryMock = vi.fn();
const createVideoItemFromFileMock = vi.fn();

vi.mock("../../../widgets/shared/lib/indexed-db", () => ({
	createVideoFileRepository: createVideoFileRepositoryMock,
	createVideoItemFromFile: createVideoItemFromFileMock,
}));

function createItem(id: string, order: number, name = `${id}.mp4`): VideoItem {
	return {
		id,
		name,
		mimeType: "video/mp4",
		size: 1024,
		persistedAt: "2026-03-17T10:00:00.000Z",
		storageKey: name,
		order,
	};
}

function createRecord(item: VideoItem): PersistedVideoRecord {
	return {
		item,
		file: new File(["video"], item.name, { type: item.mimeType }),
	};
}

describe("useVideoUpload", () => {
	beforeEach(() => {
		createVideoFileRepositoryMock.mockReset();
		createVideoItemFromFileMock.mockReset();
	});

	it("restores persisted items on mount", async () => {
		createVideoFileRepositoryMock.mockResolvedValue({
			getAll: vi.fn().mockResolvedValue([
				createRecord(createItem("b", 1)),
				createRecord(createItem("a", 0)),
			]),
			save: vi.fn(),
			delete: vi.fn(),
		});

		const { useVideoUpload } = await import("./use-video-upload");
		const { result } = renderHook(() => useVideoUpload());

		await waitFor(() => {
			expect(result.current.isRestoring).toBe(false);
		});

		expect(result.current.items.map((item) => item.id)).toEqual(["b", "a"]);
		expect(result.current.errorMessage).toBeNull();
	});

	it("accepts valid video files and reports invalid selections", async () => {
		const saveMock = vi.fn().mockResolvedValue(undefined);
		createVideoFileRepositoryMock.mockResolvedValue({
			getAll: vi.fn().mockResolvedValue([]),
			save: saveMock,
			delete: vi.fn(),
		});
		createVideoItemFromFileMock.mockImplementation((file: File, order: number) =>
			createItem(`item-${order}`, order, file.name),
		);

		const { useVideoUpload } = await import("./use-video-upload");
		const { result } = renderHook(() => useVideoUpload());

		await waitFor(() => {
			expect(result.current.isRestoring).toBe(false);
		});

		const files = [
			new File(["video"], "clip.mp4", { type: "video/mp4" }),
			new File(["text"], "note.txt", { type: "text/plain" }),
		];

		await act(async () => {
			await result.current.addFiles(files);
		});

		expect(createVideoItemFromFileMock).toHaveBeenCalledTimes(1);
		expect(saveMock).toHaveBeenCalledTimes(1);
		expect(result.current.items.map((item) => item.name)).toEqual(["clip.mp4"]);
		expect(result.current.uploadIssues).toEqual([
			{
				fileName: "note.txt",
				reason: "Файл не является видео.",
			},
		]);
	});

	it("removes an item and re-normalizes persisted order", async () => {
		const remainingRecords = [
			createRecord(createItem("b", 1)),
			createRecord(createItem("c", 2)),
		];
		const getAllMock = vi
			.fn()
			.mockResolvedValueOnce([
				createRecord(createItem("a", 0)),
				...remainingRecords,
			])
			.mockResolvedValueOnce(remainingRecords);
		const saveMock = vi.fn().mockResolvedValue(undefined);
		const deleteMock = vi.fn().mockResolvedValue(undefined);

		createVideoFileRepositoryMock.mockResolvedValue({
			getAll: getAllMock,
			save: saveMock,
			delete: deleteMock,
		});

		const { useVideoUpload } = await import("./use-video-upload");
		const { result } = renderHook(() => useVideoUpload());

		await waitFor(() => {
			expect(result.current.items).toHaveLength(3);
		});

		await act(async () => {
			await result.current.removeItem("a");
		});

		expect(deleteMock).toHaveBeenCalledWith("a");
		expect(saveMock).toHaveBeenCalledTimes(2);
		expect(result.current.items.map((item) => [item.id, item.order])).toEqual([
			["b", 0],
			["c", 1],
		]);
	});
});

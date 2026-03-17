import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
	MergeErrorResult,
	MergeProgress,
	VideoItem,
} from "../../../entities/video-item";

class WorkerMock {
	static instances: WorkerMock[] = [];

	onmessage: ((event: MessageEvent) => void) | null = null;
	postMessage = vi.fn();
	terminate = vi.fn();

	constructor() {
		WorkerMock.instances.push(this);
	}

	emit(data: unknown) {
		this.onmessage?.({ data } as MessageEvent);
	}
}

function createItem(
	id: string,
	name = `${id}.mp4`,
	mimeType = "video/mp4",
): VideoItem {
	return {
		id,
		name,
		mimeType,
		size: 1024,
		persistedAt: "2026-03-17T10:00:00.000Z",
		storageKey: name,
		order: 0,
	};
}

function createSourceFilesById(items: VideoItem[]) {
	return Object.fromEntries(
		items.map((item) => [
			item.id,
			new File(["video"], item.name, { type: item.mimeType }),
		]),
	);
}

describe("useVideoMerge", () => {
	beforeEach(() => {
		WorkerMock.instances = [];
		vi.stubGlobal("Worker", WorkerMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("keeps merge disabled until at least two compatible items are present", async () => {
		const { useVideoMerge } = await import("./use-video-merge");
		const { result, rerender } = renderHook(
			({ items }) => useVideoMerge(items, createSourceFilesById(items)),
			{
				initialProps: {
					items: [createItem("a")],
				},
			},
		);

		expect(result.current.canMerge).toBe(false);
		expect(result.current.status).toEqual({
			type: "idle",
			label: "Нужно минимум 2 видео",
		});

		rerender({
			items: [
				createItem("a", "a.mp4", "video/mp4"),
				createItem("b", "b.webm", "video/webm"),
			],
		});

		expect(result.current.canMerge).toBe(false);
		expect(result.current.precheckIssue).toContain("одного формата");
	});

	it("starts a merge, forwards worker messages, and exposes the result file", async () => {
		const { useVideoMerge } = await import("./use-video-merge");
		const items = [createItem("a", "first.mp4"), createItem("b", "second.mp4")];
		const sourceFilesById = createSourceFilesById(items);
		const { result } = renderHook(() => useVideoMerge(items, sourceFilesById));
		const worker = WorkerMock.instances[0];

		act(() => {
			result.current.startMerge();
		});

		expect(worker.postMessage).toHaveBeenCalledWith({
			type: "merge",
			payload: {
				sources: items.map((item) => ({
					item,
					file: sourceFilesById[item.id],
				})),
				outputFileName: "first-merged.mp4",
			},
		});
		expect(result.current.isMerging).toBe(true);
		expect(result.current.progress).toMatchObject({
			phase: "preparing",
			message: "Подготовка файлов...",
		});

		const progressMessage: { type: "progress"; payload: MergeProgress } = {
			type: "progress",
			payload: {
				phase: "merging",
				message: "Объединение видео...",
				progress: 0.4,
				processedItems: 2,
				totalItems: 5,
				mergeStage: "copy",
			},
		};

		act(() => {
			worker.emit(progressMessage);
		});

		await waitFor(() => {
			expect(result.current.status).toEqual({
				type: "processing",
				label: "Объединение видео...",
				progress: 0.42,
				processedItems: 2,
				totalItems: 5,
			});
		});

		act(() => {
			worker.emit({
				type: "success",
				payload: {
					fileName: "first-merged.mp4",
					fileData: new Uint8Array([1, 2, 3]).buffer,
				},
			});
		});

		await waitFor(() => {
			expect(result.current.resultFile?.name).toBe("first-merged.mp4");
		});

		expect(result.current.isMerging).toBe(false);
		expect(result.current.errorMessage).toBeNull();
		expect(result.current.status).toEqual({
			type: "success",
			label: "",
		});
	});

	it("clears the previous result when the video list changes", async () => {
		const { useVideoMerge } = await import("./use-video-merge");
		const initialItems = [
			createItem("a", "first.mp4"),
			createItem("b", "second.mp4"),
		];
		const { result, rerender } = renderHook(
			({ items }) => useVideoMerge(items, createSourceFilesById(items)),
			{
				initialProps: {
					items: initialItems,
				},
			},
		);
		const worker = WorkerMock.instances[0];

		act(() => {
			result.current.startMerge();
		});

		act(() => {
			worker.emit({
				type: "success",
				payload: {
					fileName: "first-merged.mp4",
					fileData: new Uint8Array([1, 2, 3]).buffer,
				},
			});
		});

		await waitFor(() => {
			expect(result.current.resultFile?.name).toBe("first-merged.mp4");
		});

		rerender({
			items: [createItem("a", "first.mp4")],
		});

		await waitFor(() => {
			expect(result.current.resultFile).toBeNull();
		});
	});

	it("ignores regressive progress updates from the worker", async () => {
		const { useVideoMerge } = await import("./use-video-merge");
		const items = [createItem("a", "first.mp4"), createItem("b", "second.mp4")];
		const { result } = renderHook(() =>
			useVideoMerge(items, createSourceFilesById(items)),
		);
		const worker = WorkerMock.instances[0];

		act(() => {
			result.current.startMerge();
		});

		act(() => {
			worker.emit({
				type: "progress",
				payload: {
					phase: "preparing",
					message: "Подготовка файлов 2/2",
					processedItems: 2,
					totalItems: 2,
				},
			});
		});

		await waitFor(() => {
			expect(result.current.status).toEqual({
				type: "processing",
				label: "Подготовка файлов 2/2",
				progress: 0.3,
				processedItems: 2,
				totalItems: 2,
			});
		});

		act(() => {
			worker.emit({
				type: "progress",
				payload: {
					phase: "loading-ffmpeg",
					message: "Загрузка ffmpeg.wasm...",
				},
			});
		});

		await waitFor(() => {
			expect(result.current.status).toEqual({
				type: "processing",
				label: "Подготовка файлов 2/2",
				progress: 0.3,
				processedItems: 2,
				totalItems: 2,
			});
		});
	});

	it("surfaces worker failures and blocks incompatible start attempts", async () => {
		const { useVideoMerge } = await import("./use-video-merge");
		const compatibleItems = [
			createItem("a", "first.mp4"),
			createItem("b", "second.mp4"),
		];
		const { result } = renderHook(() =>
			useVideoMerge(compatibleItems, createSourceFilesById(compatibleItems)),
		);
		const worker = WorkerMock.instances[0];

		act(() => {
			result.current.startMerge();
		});

		const errorPayload: MergeErrorResult = {
			type: "error",
			code: "worker",
			message: "Не удалось выполнить объединение видео.",
		};

		act(() => {
			worker.emit({
				type: "error",
				payload: errorPayload,
			});
		});

		await waitFor(() => {
			expect(result.current.errorMessage).toBe(errorPayload.message);
		});

		expect(result.current.status).toEqual({
			type: "error",
			label: errorPayload.message,
		});

		const incompatibleItems = [
			createItem("x", "first.mp4", "video/mp4"),
			createItem("y", "second.webm", "video/webm"),
		];
		const { result: incompatibleResult } = renderHook(() =>
			useVideoMerge(
				incompatibleItems,
				createSourceFilesById(incompatibleItems),
			),
		);
		const secondWorker = WorkerMock.instances[1];

		act(() => {
			incompatibleResult.current.startMerge();
		});

		expect(secondWorker.postMessage).not.toHaveBeenCalled();
		expect(incompatibleResult.current.errorMessage).toContain("одного формата");
	});

	it("terminates the worker on unmount", async () => {
		const { useVideoMerge } = await import("./use-video-merge");
		const { unmount } = renderHook(() =>
			useVideoMerge(
				[createItem("a"), createItem("b")],
				createSourceFilesById([createItem("a"), createItem("b")]),
			),
		);
		const worker = WorkerMock.instances[0];

		unmount();

		expect(worker.terminate).toHaveBeenCalledTimes(1);
	});
});

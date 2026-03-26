import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_IMAGE_CONVERT_FILES } from "./image-convert-validation";

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

const createZipArchiveMock = vi.fn(
	(_files: unknown, fileName: string) =>
		new File([new Uint8Array([9, 9])], fileName, { type: "application/zip" }),
);

vi.mock("../../../widgets/shared/lib/archive", () => ({
	createZipArchive: createZipArchiveMock,
}));

describe("useImageConvert", () => {
	beforeEach(() => {
		WorkerMock.instances = [];
		createZipArchiveMock.mockClear();
		vi.stubGlobal("Worker", WorkerMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("starts with an empty session and default png output", async () => {
		const { useImageConvert } = await import("./use-image-convert");
		const { result } = renderHook(() => useImageConvert());

		expect(result.current.outputFormat).toBe("png");
		expect(result.current.items).toEqual([]);
		expect(result.current.counts).toEqual({
			total: 0,
			queued: 0,
			converting: 0,
			done: 0,
			failed: 0,
		});
		expect(result.current.archive).toEqual({
			isReady: false,
			fileName: null,
			file: null,
			successfulCount: 0,
			failedCount: 0,
		});
	});

	it("stores accepted HEIC files and reports invalid selections", async () => {
		const { useImageConvert } = await import("./use-image-convert");
		const { result } = renderHook(() => useImageConvert());

		await act(async () => {
			await result.current.addFiles([
				new File(["good"], "first.heic", { type: "image/heic" }),
				new File(["bad"], "second.png", { type: "image/png" }),
			]);
		});

		expect(result.current.items).toHaveLength(1);
		expect(result.current.items[0]).toMatchObject({
			name: "first.heic",
			status: "queued",
			sessionOrder: 0,
		});
		expect(result.current.counts).toEqual({
			total: 1,
			queued: 1,
			converting: 0,
			done: 0,
			failed: 0,
		});
		expect(result.current.issues).toEqual([
			{
				fileName: "second.png",
				reason: "Поддерживаются только HEIC-изображения.",
			},
		]);
		expect(result.current.errorMessage).toBeNull();
	});

	it("shows a friendly error for empty selections", async () => {
		const { useImageConvert } = await import("./use-image-convert");
		const { result } = renderHook(() => useImageConvert());

		await act(async () => {
			await result.current.addFiles([]);
		});

		expect(result.current.items).toEqual([]);
		expect(result.current.issues).toEqual([]);
		expect(result.current.errorMessage).toBe(
			"Выберите хотя бы один HEIC-файл.",
		);
	});

	it("supports changing output format before conversion starts", async () => {
		const { useImageConvert } = await import("./use-image-convert");
		const { result } = renderHook(() => useImageConvert());

		act(() => {
			result.current.setOutputFormat("jpg");
		});

		expect(result.current.outputFormat).toBe("jpg");
	});

	it("respects the session file limit across multiple additions", async () => {
		const { useImageConvert } = await import("./use-image-convert");
		const { result } = renderHook(() => useImageConvert());
		const initialFiles = Array.from(
			{ length: MAX_IMAGE_CONVERT_FILES - 1 },
			(_, index) =>
				new File(["img"], `img-${index}.heic`, { type: "image/heic" }),
		);

		await act(async () => {
			await result.current.addFiles(initialFiles);
		});

		await act(async () => {
			await result.current.addFiles([
				new File(["ok"], "last.heic", { type: "image/heic" }),
				new File(["overflow"], "overflow.heic", { type: "image/heic" }),
			]);
		});

		expect(result.current.counts.total).toBe(MAX_IMAGE_CONVERT_FILES);
		expect(result.current.counts.queued).toBe(MAX_IMAGE_CONVERT_FILES);
		expect(result.current.issues).toEqual([
			{
				fileName: "overflow.heic",
				reason: "Превышен лимит сессии: максимум 5000 файлов.",
			},
		]);
	});

	it("clears the session and resets the output format", async () => {
		const { useImageConvert } = await import("./use-image-convert");
		const { result } = renderHook(() => useImageConvert());

		await act(async () => {
			result.current.setOutputFormat("jpg");
			await result.current.addFiles([
				new File(["img"], "first.heic", { type: "image/heic" }),
			]);
		});

		const previousSessionId = result.current.sessionId;

		act(() => {
			result.current.clearSession();
		});

		expect(result.current.sessionId).not.toBe(previousSessionId);
		expect(result.current.outputFormat).toBe("png");
		expect(result.current.items).toEqual([]);
		expect(result.current.issues).toEqual([]);
	});

	it("forwards queued files to the worker, records partial failures, and creates the archive", async () => {
		const { useImageConvert } = await import("./use-image-convert");
		const { result } = renderHook(() => useImageConvert());

		await act(async () => {
			await result.current.addFiles([
				new File(["a"], "first.heic", { type: "image/heic" }),
				new File(["b"], "second.heic", { type: "image/heic" }),
			]);
		});

		act(() => {
			result.current.startConversion();
		});

		const worker = WorkerMock.instances[0];
		expect(worker.postMessage).toHaveBeenCalledWith({
			type: "convert",
			payload: {
				sessionId: result.current.sessionId,
				outputFormat: "png",
				items: [
					{
						id: result.current.items[0].id,
						name: "first.heic",
						file: result.current.items[0].file,
					},
					{
						id: result.current.items[1].id,
						name: "second.heic",
						file: result.current.items[1].file,
					},
				],
			},
		});

		act(() => {
			worker.emit({
				type: "item-started",
				payload: {
					currentItemId: result.current.items[0].id,
					currentFileName: "first.heic",
					processedItems: 0,
					totalItems: 2,
					message: "Конвертация 1/2",
				},
			});
			worker.emit({
				type: "item-complete",
				payload: {
					id: result.current.items[0].id,
					fileName: "first.png",
					mimeType: "image/png",
					fileData: new Uint8Array([1, 2]).buffer,
				},
			});
			worker.emit({
				type: "item-failed",
				payload: {
					id: result.current.items[1].id,
					errorMessage: "Изображение не удалось прочитать.",
				},
			});
			worker.emit({
				type: "complete",
				payload: {
					processedItems: 2,
					totalItems: 2,
					successfulCount: 1,
					failedCount: 1,
				},
			});
		});

		await waitFor(() => {
			expect(result.current.archive.fileName).toMatch(/^image-convert-png-/);
		});

		expect(result.current.items.map((item) => item.status)).toEqual([
			"done",
			"failed",
		]);
		expect(result.current.items[0].outputFile).toBeNull();
		expect(result.current.items[1].errorMessage).toBe(
			"Изображение не удалось прочитать.",
		);
		expect(createZipArchiveMock).toHaveBeenCalledTimes(1);
	});

	it("allows failed items to be queued again for a smaller rerun batch", async () => {
		const { useImageConvert } = await import("./use-image-convert");
		const { result } = renderHook(() => useImageConvert());

		await act(async () => {
			await result.current.addFiles([
				new File(["a"], "first.heic", { type: "image/heic" }),
				new File(["b"], "second.heic", { type: "image/heic" }),
			]);
		});

		act(() => {
			result.current.startConversion();
		});

		const worker = WorkerMock.instances[0];

		act(() => {
			worker.emit({
				type: "item-failed",
				payload: {
					id: result.current.items[1].id,
					errorMessage: "Не удалось конвертировать изображение.",
				},
			});
			worker.emit({
				type: "complete",
				payload: {
					processedItems: 2,
					totalItems: 2,
					successfulCount: 0,
					failedCount: 1,
				},
			});
		});

		act(() => {
			result.current.rerunFailedItems();
		});

		expect(result.current.items.map((item) => item.status)).toEqual([
			"queued",
			"queued",
		]);
		expect(result.current.items[1].errorMessage).toBeNull();
	});
});

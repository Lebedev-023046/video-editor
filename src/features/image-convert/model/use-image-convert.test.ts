import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MAX_IMAGE_CONVERT_FILES } from "./image-convert-validation";
import { useImageConvert } from "./use-image-convert";

describe("useImageConvert", () => {
	it("starts with an empty session and default png output", () => {
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
			successfulCount: 0,
		});
	});

	it("stores accepted HEIC files and reports invalid selections", async () => {
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
	});

	it("supports changing output format before conversion starts", () => {
		const { result } = renderHook(() => useImageConvert());

		act(() => {
			result.current.setOutputFormat("jpg");
		});

		expect(result.current.outputFormat).toBe("jpg");
	});

	it("respects the session file limit across multiple additions", async () => {
		const { result } = renderHook(() => useImageConvert());
		const initialFiles = Array.from({ length: MAX_IMAGE_CONVERT_FILES - 1 }, (_, index) =>
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
});

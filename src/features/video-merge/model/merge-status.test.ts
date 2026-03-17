import { describe, expect, it } from "vitest";

import type { MergeProgress } from "../../../entities/video-item";
import { getMergeStatusView } from "./merge-status";

const progress: MergeProgress = {
	phase: "merging",
	message: "Объединение видео...",
	progress: 0.5,
	processedItems: 2,
	totalItems: 4,
	mergeStage: "copy",
};

describe("getMergeStatusView", () => {
	it("prefers error state when an error is present", () => {
		expect(
			getMergeStatusView(progress, true, "Ошибка обработки", false, true),
		).toEqual({
			type: "error",
			label: "Ошибка обработки",
		});
	});

	it("returns processing state with progress details", () => {
		expect(getMergeStatusView(progress, true, null, false, true)).toEqual({
			type: "processing",
			label: "Объединение видео...",
			progress: 0.44999999999999996,
			processedItems: 2,
			totalItems: 4,
		});
	});

	it("derives progress from processed item counts when explicit progress is absent", () => {
		expect(
			getMergeStatusView(
				{
					phase: "preparing",
					message: "Подготовка файлов 1/4",
					processedItems: 1,
					totalItems: 4,
				},
				true,
				null,
				false,
				true,
			),
		).toEqual({
			type: "processing",
			label: "Подготовка файлов 1/4",
			progress: 0.075,
			processedItems: 1,
			totalItems: 4,
		});
	});

	it("maps finalizing to completion", () => {
		expect(
			getMergeStatusView(
				{
					phase: "finalizing",
					message: "Подготовка результата...",
				},
				true,
				null,
				false,
				true,
			),
		).toEqual({
			type: "processing",
			label: "Подготовка результата...",
			progress: 1,
			processedItems: undefined,
			totalItems: undefined,
		});
	});

	it("continues progress during transcode fallback instead of restarting", () => {
		expect(
			getMergeStatusView(
				{
					phase: "merging",
					message: "Перекодирование для совместимости...",
					progress: 0.5,
					processedItems: 4,
					totalItems: 4,
					mergeStage: "transcode",
				},
				true,
				null,
				false,
				true,
			),
		).toEqual({
			type: "processing",
			label: "Перекодирование для совместимости...",
			progress: 0.7749999999999999,
			processedItems: 4,
			totalItems: 4,
		});
	});

	it("reports success and idle states correctly", () => {
		expect(getMergeStatusView(null, false, null, true, true)).toEqual({
			type: "success",
			label: "",
		});
		expect(getMergeStatusView(null, false, null, false, false)).toEqual({
			type: "idle",
			label: "Нужно минимум 2 видео",
		});
		expect(getMergeStatusView(null, false, null, false, true)).toEqual({
			type: "idle",
			label: "Можно объединять",
		});
	});
});

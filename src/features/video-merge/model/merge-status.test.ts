import { describe, expect, it } from "vitest";

import type { MergeProgress } from "../../../entities/video-item";
import { getMergeStatusView } from "./merge-status";

const progress: MergeProgress = {
	phase: "merging",
	message: "Объединение видео...",
	progress: 0.5,
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
			progress: 0.5,
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

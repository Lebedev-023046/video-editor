import { describe, expect, it } from "vitest";

import type { VideoItem } from "../../../entities/video-item";
import { reorderVideos } from "./reorder-videos";

function createItem(id: string, order: number): VideoItem {
	return {
		id,
		name: `${id}.mp4`,
		mimeType: "video/mp4",
		size: 1024,
		persistedAt: "2026-03-17T10:00:00.000Z",
		storageKey: `${id}.mp4`,
		order,
	};
}

describe("reorderVideos", () => {
	it("moves an item to the target position and normalizes order indexes", () => {
		const reordered = reorderVideos(
			[createItem("a", 0), createItem("b", 1), createItem("c", 2)],
			"c",
			"a",
		);

		expect(reordered.map((item) => [item.id, item.order])).toEqual([
			["c", 0],
			["a", 1],
			["b", 2],
		]);
	});

	it("returns the original array when the move cannot be resolved", () => {
		const items = [createItem("a", 0), createItem("b", 1)];

		expect(reorderVideos(items, "missing", "b")).toBe(items);
		expect(reorderVideos(items, "a", "a")).toBe(items);
	});
});

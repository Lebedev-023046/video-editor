import { describe, expect, it } from "vitest";

import { getMergeEligibleItems, sortVideoItemsByOrder } from "./selectors";
import type { VideoItem } from "./types";

function createItem(overrides: Partial<VideoItem>): VideoItem {
	return {
		id: overrides.id ?? crypto.randomUUID(),
		name: overrides.name ?? "clip.mp4",
		mimeType: overrides.mimeType ?? "video/mp4",
		size: overrides.size ?? 1024,
		persistedAt: overrides.persistedAt ?? "2026-03-17T10:00:00.000Z",
		storageKey: overrides.storageKey ?? "clip.mp4",
		order: overrides.order ?? 0,
		draftEdit: overrides.draftEdit,
		durationMs: overrides.durationMs,
		thumbnailUrl: overrides.thumbnailUrl,
	};
}

describe("video item selectors", () => {
	it("sorts items by order without mutating the source array", () => {
		const items = [
			createItem({ id: "b", order: 2 }),
			createItem({ id: "a", order: 0 }),
			createItem({ id: "c", order: 1 }),
		];

		const sortedItems = sortVideoItemsByOrder(items);

		expect(sortedItems.map((item) => item.id)).toEqual(["a", "c", "b"]);
		expect(items.map((item) => item.id)).toEqual(["b", "a", "c"]);
	});

	it("returns ordered items only when at least two clips are available", () => {
		const eligibleItems = getMergeEligibleItems([
			createItem({ id: "b", order: 1 }),
			createItem({ id: "a", order: 0 }),
		]);

		expect(eligibleItems.map((item) => item.id)).toEqual(["a", "b"]);
		expect(getMergeEligibleItems([createItem({ id: "single" })])).toEqual([]);
	});
});

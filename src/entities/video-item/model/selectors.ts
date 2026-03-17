import type { VideoItem } from "./types";

export function sortVideoItemsByOrder(items: VideoItem[]) {
	return [...items].sort((left, right) => left.order - right.order);
}

export function getMergeEligibleItems(items: VideoItem[]) {
	const orderedItems = sortVideoItemsByOrder(items);
	return orderedItems.length >= 2 ? orderedItems : [];
}

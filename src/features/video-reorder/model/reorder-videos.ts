import type { VideoItem } from "../../../entities/video-item";

export function reorderVideos(
	items: VideoItem[],
	activeId: string,
	overId: string,
) {
	const sourceIndex = items.findIndex((item) => item.id === activeId);
	const targetIndex = items.findIndex((item) => item.id === overId);

	if (
		sourceIndex === -1 ||
		targetIndex === -1 ||
		sourceIndex === targetIndex
	) {
		return items;
	}

	const nextItems = [...items];
	const [movedItem] = nextItems.splice(sourceIndex, 1);
	nextItems.splice(targetIndex, 0, movedItem);

	return nextItems.map((item, index) => ({
		...item,
		order: index,
	}));
}

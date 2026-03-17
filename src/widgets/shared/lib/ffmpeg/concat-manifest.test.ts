import { describe, expect, it } from "vitest";

import type { VideoItem } from "../../../../entities/video-item";
import { buildConcatManifest } from "./concat-manifest";

function createItem(id: string): VideoItem {
	return {
		id,
		name: `${id}.mp4`,
		mimeType: "video/mp4",
		size: 1024,
		persistedAt: "2026-03-17T10:00:00.000Z",
		storageKey: `${id}.mp4`,
		order: 0,
	};
}

describe("buildConcatManifest", () => {
	it("creates concat lines in the provided order", () => {
		expect(
			buildConcatManifest([
				{ inputName: "input-0.mp4", sourceItem: createItem("a") },
				{ inputName: "input-1.mp4", sourceItem: createItem("b") },
			]),
		).toBe("file 'input-0.mp4'\nfile 'input-1.mp4'");
	});

	it("escapes single quotes in input paths", () => {
		expect(
			buildConcatManifest([
				{ inputName: "it's-ok.mp4", sourceItem: createItem("a") },
			]),
		).toBe("file 'it'\\''s-ok.mp4'");
	});
});

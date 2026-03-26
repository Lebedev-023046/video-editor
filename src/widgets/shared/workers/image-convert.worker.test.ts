import { describe, expect, it } from "vitest";

import {
    IMAGE_CONVERT_CHUNK_SIZE,
    chunkImageConvertItems,
    shouldYieldAfterChunk,
} from "./image-convert-worker-helpers";

describe("image convert worker helpers", () => {
	it("splits large batches into smaller chunks", () => {
		const items = Array.from({ length: IMAGE_CONVERT_CHUNK_SIZE * 2 + 3 }, (_, index) => index);

		const chunks = chunkImageConvertItems(items);

		expect(chunks).toHaveLength(3);
		expect(chunks[0]).toHaveLength(IMAGE_CONVERT_CHUNK_SIZE);
		expect(chunks[1]).toHaveLength(IMAGE_CONVERT_CHUNK_SIZE);
		expect(chunks[2]).toHaveLength(3);
	});

	it("yields between chunks but not after the last chunk", () => {
		expect(shouldYieldAfterChunk(0, 3)).toBe(true);
		expect(shouldYieldAfterChunk(1, 3)).toBe(true);
		expect(shouldYieldAfterChunk(2, 3)).toBe(false);
		expect(shouldYieldAfterChunk(0, 1)).toBe(false);
	});
});

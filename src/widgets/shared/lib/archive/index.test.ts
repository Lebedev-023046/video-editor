import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { createZipArchive } from "./index";

describe("createZipArchive", () => {
	it("creates a zip file with the provided entries", async () => {
		const archive = createZipArchive(
			[
				{
					fileName: "first.png",
					data: new Uint8Array([1, 2, 3]),
				},
				{
					fileName: "second.jpg",
					data: new Uint8Array([4, 5, 6]),
				},
			],
			"images.zip",
		);
		const unzipped = unzipSync(new Uint8Array(await archive.arrayBuffer()));

		expect(archive.name).toBe("images.zip");
		expect(Object.keys(unzipped).sort()).toEqual(["first.png", "second.jpg"]);
		expect(Array.from(unzipped["first.png"])).toEqual([1, 2, 3]);
	});

	it("deduplicates flattened filenames inside the archive", async () => {
		const archive = createZipArchive([
			{
				fileName: "photo.png",
				data: new Uint8Array([1]),
			},
			{
				fileName: "photo.png",
				data: new Uint8Array([2]),
			},
		]);
		const unzipped = unzipSync(new Uint8Array(await archive.arrayBuffer()));

		expect(Object.keys(unzipped).sort()).toEqual(["photo-2.png", "photo.png"]);
	});

	it("keeps incrementing duplicate suffixes for repeated names", async () => {
		const archive = createZipArchive([
			{
				fileName: "photo",
				data: new Uint8Array([1]),
			},
			{
				fileName: "photo",
				data: new Uint8Array([2]),
			},
			{
				fileName: "photo",
				data: new Uint8Array([3]),
			},
		]);
		const unzipped = unzipSync(new Uint8Array(await archive.arrayBuffer()));

		expect(Object.keys(unzipped).sort()).toEqual([
			"photo",
			"photo-2",
			"photo-3",
		]);
		expect(Array.from(unzipped["photo-3"])).toEqual([3]);
	});
});

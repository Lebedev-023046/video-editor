import { describe, expect, it } from "vitest";

import {
    MAX_IMAGE_CONVERT_FILES,
    validateImageConvertFiles,
} from "./image-convert-validation";

describe("validateImageConvertFiles", () => {
	it("accepts HEIC files by extension and mime type", () => {
		const files = [
			new File(["a"], "photo-1.heic", { type: "" }),
			new File(["b"], "photo-2.bin", { type: "image/heic" }),
		];

		const result = validateImageConvertFiles(files, 0);

		expect(result.acceptedFiles.map((file) => file.name)).toEqual([
			"photo-1.heic",
			"photo-2.bin",
		]);
		expect(result.issues).toEqual([]);
	});

	it("rejects unsupported files with a friendly message", () => {
		const result = validateImageConvertFiles(
			[
				new File(["a"], "photo.png", { type: "image/png" }),
				new File(["b"], "note.txt", { type: "text/plain" }),
			],
			0,
		);

		expect(result.acceptedFiles).toEqual([]);
		expect(result.issues).toEqual([
			{
				fileName: "photo.png",
				reason: "Поддерживаются только HEIC-изображения.",
			},
			{
				fileName: "note.txt",
				reason: "Поддерживаются только HEIC-изображения.",
			},
		]);
	});

	it("enforces the 5000-file session limit", () => {
		const files = [
			new File(["a"], "allowed.heic", { type: "image/heic" }),
			new File(["b"], "overflow.heic", { type: "image/heic" }),
		];

		const result = validateImageConvertFiles(files, MAX_IMAGE_CONVERT_FILES - 1);

		expect(result.acceptedFiles.map((file) => file.name)).toEqual([
			"allowed.heic",
		]);
		expect(result.issues).toEqual([
			{
				fileName: "overflow.heic",
				reason: "Превышен лимит сессии: максимум 5000 файлов.",
			},
		]);
	});
});

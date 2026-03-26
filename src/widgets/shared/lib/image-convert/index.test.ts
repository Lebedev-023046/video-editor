import { describe, expect, it, vi } from "vitest";

const heicToMock = vi.fn();

vi.mock("heic-to/next", () => ({
	heicTo: heicToMock,
}));

describe("image convert helpers", () => {
	it("builds converted file names from the selected output format", async () => {
		const { buildConvertedFileName } = await import("./index");

		expect(buildConvertedFileName("photo.heic", "png")).toBe("photo.png");
		expect(buildConvertedFileName("summer.trip.HEIC", "jpg")).toBe(
			"summer.trip.jpg",
		);
	});

	it("maps decoder errors to a friendly message", async () => {
		const { getFriendlyImageConvertError } = await import("./index");

		expect(getFriendlyImageConvertError(new Error("HEIC decode failed"))).toBe(
			"Изображение не удалось прочитать.",
		);
		expect(getFriendlyImageConvertError(new Error("other failure"))).toBe(
			"Не удалось конвертировать изображение.",
		);
	});

	it("converts HEIC files into the requested mime type", async () => {
		heicToMock.mockResolvedValue({
			arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
		});
		const { convertHeicFile } = await import("./index");

		const result = await convertHeicFile(
			new File(["input"], "photo.heic", { type: "image/heic" }),
			"png",
		);

		expect(heicToMock).toHaveBeenCalledWith({
			blob: expect.any(File),
			type: "image/png",
			quality: undefined,
		});
		expect(result.fileName).toBe("photo.png");
		expect(result.mimeType).toBe("image/png");
		expect(Array.from(result.data)).toEqual([1, 2, 3]);
	});
});

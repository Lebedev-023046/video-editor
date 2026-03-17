import { describe, expect, it } from "vitest";

import {
	buildStreamCopyArgs,
	buildTranscodeArgs,
	getMergeFailureMessage,
	inferCompatibilityError,
} from "./merge-commands";

describe("merge-commands", () => {
	it("builds stream copy args with timestamp normalization", () => {
		expect(buildStreamCopyArgs("/tmp/concat.txt", "/tmp/out.mp4")).toEqual([
			"-f",
			"concat",
			"-safe",
			"0",
			"-i",
			"/tmp/concat.txt",
			"-fflags",
			"+genpts",
			"-avoid_negative_ts",
			"make_zero",
			"-c",
			"copy",
			"/tmp/out.mp4",
		]);
	});

	it("builds transcode args for a browser-safe mp4 fallback", () => {
		expect(buildTranscodeArgs("/tmp/concat.txt", "/tmp/out.mp4")).toEqual([
			"-f",
			"concat",
			"-safe",
			"0",
			"-i",
			"/tmp/concat.txt",
			"-fflags",
			"+genpts",
			"-avoid_negative_ts",
			"make_zero",
			"-movflags",
			"+faststart",
			"-pix_fmt",
			"yuv420p",
			"-c:v",
			"libx264",
			"-preset",
			"ultrafast",
			"-crf",
			"23",
			"-c:a",
			"aac",
			"-b:a",
			"192k",
			"/tmp/out.mp4",
		]);
	});

	it("treats ffmpeg concat and codec failures as compatibility issues", () => {
		expect(
			inferCompatibilityError([
				"[concat @ 0x1] Impossible to open '/tmp/input-1.mp4'",
			]),
		).toBe(true);
		expect(
			inferCompatibilityError([
				"Non monotonically increasing DTS in output stream",
			]),
		).toBe(true);
		expect(inferCompatibilityError(["some unrelated ffmpeg failure"])).toBe(
			false,
		);
	});

	it("returns a specific memory-limit message for browser ffmpeg failures", () => {
		expect(
			getMergeFailureMessage(
				["Aborted(out of memory)", "RuntimeError: memory access out of bounds"],
				true,
			),
		).toContain("нехватки памяти");
	});

	it("returns a specific file-content message when ffmpeg reports broken input", () => {
		expect(
			getMergeFailureMessage(
				["[mov,mp4,m4a,3gp,3g2,mj2 @ 0x1] moov atom not found"],
				true,
			),
		).toContain("moov atom not found");
	});
});

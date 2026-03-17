export function buildStreamCopyArgs(manifestPath: string, outputPath: string) {
	return [
		"-f",
		"concat",
		"-safe",
		"0",
		"-i",
		manifestPath,
		"-fflags",
		"+genpts",
		"-avoid_negative_ts",
		"make_zero",
		"-c",
		"copy",
		outputPath,
	];
}

export function buildTranscodeArgs(manifestPath: string, outputPath: string) {
	return [
		"-f",
		"concat",
		"-safe",
		"0",
		"-i",
		manifestPath,
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
		outputPath,
	];
}

export function inferCompatibilityError(logs: string[]) {
	const text = logs.join("\n").toLowerCase();

	return (
		text.includes("invalid data found") ||
		text.includes("non monotonically increasing dts") ||
		text.includes("could not find codec parameters") ||
		text.includes("incorrect codec parameters") ||
		text.includes("malformed aac bitstream") ||
		text.includes("aac bitstream error") ||
		text.includes("codec frame size is not set") ||
		text.includes("unsafe file name") ||
		text.includes("impossible to open") ||
		text.includes("concat")
	);
}

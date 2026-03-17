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

export function getMergeFailureMessage(
	logs: string[],
	fallbackAttempted: boolean,
) {
	const text = logs.join("\n").toLowerCase();
	const relevantLog = findRelevantLogLine(logs);

	if (
		text.includes("out of memory") ||
		text.includes("cannot enlarge memory") ||
		text.includes("memory access out of bounds") ||
		text.includes("runtimeerror") ||
		text.includes("abort(") ||
		text.includes("allocation failed")
	) {
		return "Не удалось обработать видео в браузере из-за нехватки памяти. Попробуйте объединять меньше файлов за раз или уменьшить общий размер.";
	}

	if (
		text.includes("no space left on device") ||
		text.includes("file too large")
	) {
		return "Не удалось завершить обработку из-за ограничения на размер временных данных в браузере. Попробуйте объединять меньше файлов за раз.";
	}

	if (
		text.includes("invalid data found") ||
		text.includes("could not find codec parameters") ||
		text.includes("malformed aac bitstream") ||
		text.includes("moov atom not found") ||
		text.includes("error while decoding stream") ||
		text.includes("failed to inject frame")
	) {
		return relevantLog
			? `ffmpeg сообщил проблему с входными файлами: ${relevantLog}`
			: "Один или несколько входных файлов повреждены или содержат неподдерживаемые потоки.";
	}

	if (fallbackAttempted) {
		return relevantLog
			? `Не удалось объединить видео даже после перекодирования: ${relevantLog}`
			: "Не удалось объединить видео даже после перекодирования. Проверьте, что файлы не повреждены и содержат поддерживаемые потоки.";
	}

	return relevantLog ?? "Не удалось выполнить объединение видео.";
}

function findRelevantLogLine(logs: string[]) {
	for (const line of [...logs].reverse()) {
		const normalizedLine = line.trim();
		if (!normalizedLine) {
			continue;
		}

		const lowerLine = normalizedLine.toLowerCase();
		if (
			lowerLine.includes("error") ||
			lowerLine.includes("failed") ||
			lowerLine.includes("invalid") ||
			lowerLine.includes("unsupported") ||
			lowerLine.includes("could not") ||
			lowerLine.includes("not found") ||
			lowerLine.includes("out of memory") ||
			lowerLine.includes("no space")
		) {
			return normalizedLine;
		}
	}

	return null;
}

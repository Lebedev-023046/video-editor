import { zipSync } from "fflate";

function ensureUniqueFileName(fileName: string, usedNames: Set<string>) {
	if (!usedNames.has(fileName)) {
		usedNames.add(fileName);
		return fileName;
	}

	const extensionMatch = /(\.[^./]+)$/u.exec(fileName);
	const extension = extensionMatch?.[1] ?? "";
	const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
	let counter = 2;

	while (true) {
		const candidate = `${baseName}-${counter}${extension}`;
		if (!usedNames.has(candidate)) {
			usedNames.add(candidate);
			return candidate;
		}

		counter += 1;
	}
}

export function createZipArchive(
	files: Array<{
		fileName: string;
		data: Uint8Array;
	}>,
	archiveFileName = "converted-images.zip",
) {
	const usedNames = new Set<string>();
	const archiveEntries = Object.fromEntries(
		files.map((file) => [
			ensureUniqueFileName(file.fileName, usedNames),
			file.data,
		]),
	);
	const zipData = zipSync(archiveEntries, { level: 6 });
	const zipBuffer = zipData.slice().buffer;

	return new File([zipBuffer], archiveFileName, {
		type: "application/zip",
	});
}

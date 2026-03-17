import { useEffect, useState } from "react";

import type {
	PersistedVideoRecord,
	VideoItem,
} from "../../../entities/video-item";
import {
	createVideoFileRepository,
	createVideoItemFromFile,
	type VideoFileRepository,
} from "../../../widgets/shared/lib/indexed-db";

interface UploadIssue {
	fileName: string;
	reason: string;
}

interface UploadState {
	items: VideoItem[];
	sourceFilesById: Record<string, File>;
	isSaving: boolean;
	errorMessage: string | null;
	uploadIssues: UploadIssue[];
	addFiles: (files: FileList | File[]) => Promise<void>;
	removeItem: (id: string) => Promise<void>;
	removeAllItems: () => Promise<void>;
}

function isVideoFile(file: File) {
	return (
		file.type.startsWith("video/") ||
		/\.(mp4|mov|webm|m4v|ogg|ogv|avi|mkv)$/i.test(file.name)
	);
}

function createFriendlyIssue(file: File): UploadIssue {
	return {
		fileName: file.name,
		reason: "Файл не является видео.",
	};
}

export function useVideoUpload(): UploadState {
	const [repository, setRepository] = useState<VideoFileRepository | null>(
		null,
	);
	const [items, setItems] = useState<VideoItem[]>([]);
	const [sourceFilesById, setSourceFilesById] = useState<Record<string, File>>(
		{},
	);
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [uploadIssues, setUploadIssues] = useState<UploadIssue[]>([]);

	useEffect(() => {
		let isMounted = true;

		async function restore() {
			try {
				const nextRepository = await createVideoFileRepository();

				if (!isMounted) {
					return;
				}

				setRepository(nextRepository);

				const records: PersistedVideoRecord[] = await nextRepository.getAll();

				if (!isMounted) {
					return;
				}

				setItems(records.map((record: PersistedVideoRecord) => record.item));
				setSourceFilesById(
					Object.fromEntries(
						records.map((record: PersistedVideoRecord) => [
							record.item.id,
							record.file as File,
						]),
					),
				);
			} catch {
				if (isMounted) {
					setErrorMessage("Не удалось инициализировать хранилище видео.");
				}
			}
		}

		void restore();

		return () => {
			isMounted = false;
		};
	}, []);

	async function addFiles(files: FileList | File[]) {
		if (!repository) {
			setErrorMessage("Хранилище еще загружается.");
			return;
		}

		setIsSaving(true);
		setErrorMessage(null);

		const incomingFiles = Array.from(files);
		const validFiles = incomingFiles.filter(isVideoFile);
		const issues = incomingFiles
			.filter((file) => !isVideoFile(file))
			.map(createFriendlyIssue);

		setUploadIssues(issues);

		if (validFiles.length === 0) {
			setIsSaving(false);
			return;
		}

		try {
			const startOrder = items.length;
			const newItems = validFiles.map((file, index) =>
				createVideoItemFromFile(file, startOrder + index),
			);

			await Promise.all(
				newItems.map((item, index) =>
					repository.save({
						item,
						file: validFiles[index],
					}),
				),
			);

			setItems((currentItems) => [...currentItems, ...newItems]);
			setSourceFilesById((currentFiles) => ({
				...currentFiles,
				...Object.fromEntries(
					newItems.map((item, index) => [item.id, validFiles[index]]),
				),
			}));
		} catch {
			setErrorMessage("Не удалось сохранить видео в браузере.");
		} finally {
			setIsSaving(false);
		}
	}

	async function removeItem(id: string) {
		if (!repository) {
			return;
		}

		setErrorMessage(null);

		try {
			await repository.delete(id);
			const remainingRecords: PersistedVideoRecord[] =
				await repository.getAll();
			const normalizedRecords = remainingRecords.map(
				(record: PersistedVideoRecord, index) => ({
					...record,
					item: {
						...record.item,
						order: index,
					},
				}),
			);

			await Promise.all(
				normalizedRecords.map((record: PersistedVideoRecord) =>
					repository.save(record),
				),
			);

			setItems(
				normalizedRecords.map((record: PersistedVideoRecord) => record.item),
			);
			setSourceFilesById((currentFiles) =>
				Object.fromEntries(
					Object.entries(currentFiles).filter(
						([currentId]) => currentId !== id,
					),
				),
			);
		} catch {
			setErrorMessage("Не удалось удалить видео.");
		}
	}

	async function removeAllItems() {
		if (!repository) {
			return;
		}

		setErrorMessage(null);

		try {
			await repository.clear();
			setItems([]);
			setSourceFilesById({});
		} catch {
			setErrorMessage("Не удалось удалить все видео.");
		}
	}

	return {
		items,
		sourceFilesById,
		isSaving,
		errorMessage,
		uploadIssues,
		addFiles,
		removeItem,
		removeAllItems,
	};
}

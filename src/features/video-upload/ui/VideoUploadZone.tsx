import { useId, useState, type DragEvent } from "react";

interface VideoUploadZoneProps {
	disabled?: boolean;
	isSaving: boolean;
	onFilesSelected: (files: FileList | null) => void;
}

export function VideoUploadZone({
	disabled = false,
	isSaving,
	onFilesSelected,
}: VideoUploadZoneProps) {
	const inputId = useId();
	const [isDragging, setIsDragging] = useState(false);

	function preventDefaults(event: DragEvent<HTMLElement>) {
		event.preventDefault();
		event.stopPropagation();
	}

	function handleDragEnter(event: DragEvent<HTMLElement>) {
		preventDefaults(event);

		if (!disabled) {
			setIsDragging(true);
		}
	}

	function handleDragLeave(event: DragEvent<HTMLElement>) {
		preventDefaults(event);

		if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
			return;
		}

		setIsDragging(false);
	}

	function handleDrop(event: DragEvent<HTMLElement>) {
		preventDefaults(event);
		setIsDragging(false);

		if (!disabled) {
			onFilesSelected(event.dataTransfer.files);
		}
	}

	return (
		<label
			className={`upload-zone${isDragging ? " upload-zone-active" : ""}`}
			htmlFor={inputId}
			onDragEnter={handleDragEnter}
			onDragOver={preventDefaults}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<input
				id={inputId}
				className="sr-only"
				type="file"
				accept="video/*"
				multiple
				disabled={disabled}
				onChange={(event) => {
					onFilesSelected(event.target.files);
					event.currentTarget.value = "";
				}}
			/>
			<strong>{isSaving ? "Сохранение..." : "Добавить видео"}</strong>
			<span>Нажмите или перетащите файлы сюда</span>
		</label>
	);
}

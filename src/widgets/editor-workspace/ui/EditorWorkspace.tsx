import { DownloadResult } from "../../../features/video-download";
import { MergePanel, useVideoMerge } from "../../../features/video-merge";
import {
	VideoUploadZone,
	useVideoUpload,
} from "../../../features/video-upload";
import { formatFileSize } from "../../shared/lib/format-file-size";
import { VideoLibraryPanel } from "./VideoLibraryPanel";

export function EditorWorkspace() {
	const {
		items,
		sourceFilesById,
		isSaving,
		errorMessage,
		uploadIssues,
		addFiles,
		removeItem,
		removeAllItems,
		reorderItems,
	} = useVideoUpload();
	const { canMerge, isMerging, precheckIssue, resultFile, status, startMerge } =
		useVideoMerge(items, sourceFilesById);

	const shouldShowLibrary = items.length > 0;
	const shouldShowMessages = Boolean(errorMessage) || uploadIssues.length > 0;
	const totalSize = items.reduce((sum, item) => sum + item.size, 0);
	const totalSizeLabel =
		items.length > 0 ? `Общий размер: ${formatFileSize(totalSize)}` : null;

	return (
		<div className="editor-page">
			<section className="upload-shell">
				<VideoUploadZone
					disabled={false}
					isSaving={isSaving}
					onFilesSelected={(files) => {
						if (files) {
							void addFiles(files);
						}
					}}
				/>
			</section>

			{shouldShowMessages ? (
				<section className="status-grid">
					<article className="card section-card">
						{errorMessage ? (
							<p className="error-banner">{errorMessage}</p>
						) : null}
						{uploadIssues.length > 0 ? (
							<ul className="issue-list">
								{uploadIssues.map((issue) => (
									<li key={`${issue.fileName}-${issue.reason}`}>
										<strong>{issue.fileName}</strong>
										<span>{issue.reason}</span>
									</li>
								))}
							</ul>
						) : null}
					</article>
				</section>
			) : null}

			{shouldShowLibrary ? (
				<section className="workspace-grid">
					<VideoLibraryPanel
						items={items}
						isSaving={isSaving}
						onRemove={(id) => removeItem(id)}
						onRemoveAll={() => removeAllItems()}
						onReorder={(sourceIndex, destinationIndex) =>
							reorderItems(sourceIndex, destinationIndex)
						}
					/>
				</section>
			) : null}

			<MergePanel
				canMerge={canMerge && !isSaving}
				isMerging={isMerging}
				status={
					isSaving ? { type: "processing", label: "Сохранение..." } : status
				}
				hint={
					precheckIssue ??
					"Лучше использовать одинаковые MP4 с совпадающими кодеками."
				}
				totalSizeLabel={totalSizeLabel}
				onMerge={startMerge}
			/>
			<DownloadResult file={resultFile} />
		</div>
	);
}

import { DownloadResult } from "../../../features/video-download";
import { MergePanel, useVideoMerge } from "../../../features/video-merge";
import {
	VideoUploadZone,
	useVideoUpload,
} from "../../../features/video-upload";
import { VideoLibraryPanel } from "./VideoLibraryPanel";

export function EditorWorkspace() {
	const {
		items,
		isRestoring,
		isSaving,
		errorMessage,
		uploadIssues,
		addFiles,
		removeItem,
	} = useVideoUpload();
	const { canMerge, isMerging, resultFile, status, startMerge } =
		useVideoMerge(items);

	const shouldShowLibrary = items.length > 0 || isRestoring;
	const shouldShowMessages = Boolean(errorMessage) || uploadIssues.length > 0;

	return (
		<div className="editor-page">
			<section className="upload-shell">
				<VideoUploadZone
					disabled={isRestoring}
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
						isRestoring={isRestoring}
						onRemove={(id) => removeItem(id)}
					/>
				</section>
			) : null}

			<MergePanel
				canMerge={canMerge && !isSaving && !isRestoring}
				isMerging={isMerging}
				status={
					isSaving ? { type: "processing", label: "Сохранение..." } : status
				}
				onMerge={startMerge}
			/>
			<DownloadResult file={resultFile} />
		</div>
	);
}

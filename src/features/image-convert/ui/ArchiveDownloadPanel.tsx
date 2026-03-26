import { getDownloadFileName } from "../../../widgets/shared/lib/browser/download-file";

import type { ImageConvertArchiveState } from "../model/image-convert-types";

interface ArchiveDownloadPanelProps {
	archive: ImageConvertArchiveState;
	archiveUrl: string | null;
}

export function ArchiveDownloadPanel({
	archive,
	archiveUrl,
}: ArchiveDownloadPanelProps) {
	const hasSuccesses = archive.successfulCount > 0;
	const hasFailures = archive.failedCount > 0;

	return (
		<section className="card section-card image-download-panel">
			<div className="image-session-copy">
				<strong>ZIP-архив</strong>
				<p>
					{!hasSuccesses
						? "Архив станет доступен после хотя бы одной успешной конвертации."
						: hasFailures
							? `Готов частичный архив: ${archive.successfulCount} из ${
									archive.successfulCount + archive.failedCount
								} файлов. Часть элементов не вошла из-за ошибок конвертации.`
							: `Архив готов: ${archive.successfulCount} файлов.`}
				</p>
			</div>

			<div className="download-result image-download-result">
				{archive.isReady && archive.file && archiveUrl ? (
					<a
						className="primary-button download-button"
						href={archiveUrl}
						download={getDownloadFileName(archive.file.name)}
					>
						Скачать ZIP ({archive.successfulCount})
					</a>
				) : (
					<span className="status-pill">Пока недоступен</span>
				)}
			</div>

			{hasSuccesses && hasFailures ? (
				<p className="image-download-note">
					Неуспешные файлы не включены в архив. Их можно повторно поставить в
					очередь и собрать обновленный ZIP после следующего прогона.
				</p>
			) : null}
		</section>
	);
}

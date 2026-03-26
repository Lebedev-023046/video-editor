import { useEffect, useState } from "react";

import {
	createObjectUrl,
	revokeObjectUrl,
} from "../../../widgets/shared/lib/browser/object-url";
import { useImageConvert } from "../model/use-image-convert";
import { ArchiveDownloadPanel } from "./ArchiveDownloadPanel";
import { ConversionStatusList } from "./ConversionStatusList";
import { ConversionSummary } from "./ConversionSummary";
import { ImageUploadZone } from "./ImageUploadZone";

export function ImageConvertTab() {
	const {
		outputFormat,
		items,
		counts,
		issues,
		isAddingFiles,
		isConverting,
		progress,
		errorMessage,
		archive,
		addFiles,
		clearSession,
		setOutputFormat,
		startConversion,
		rerunFailedItems,
	} = useImageConvert();
	const [archiveUrl, setArchiveUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!archive.file) {
			setArchiveUrl((currentUrl) => {
				revokeObjectUrl(currentUrl);
				return null;
			});
			return;
		}

		const nextUrl = createObjectUrl(archive.file);
		setArchiveUrl((currentUrl) => {
			revokeObjectUrl(currentUrl);
			return nextUrl;
		});

		return () => {
			revokeObjectUrl(nextUrl);
		};
	}, [archive.file]);

	return (
		<div className="image-convert-layout">
			<section className="card section-card image-convert-card">
				<div className="image-convert-hero">
					<span className="status-pill">HEIC to PNG / JPG</span>
					<h2>Конвертация изображений</h2>
					<p>
						Загрузите до 5000 HEIC-файлов, выберите формат вывода и подготовьте
						очередь для последующей пакетной конвертации.
					</p>
				</div>

				<div className="format-switch" role="group" aria-label="Формат вывода">
					<button
						type="button"
						className={`workspace-tab${outputFormat === "png" ? " workspace-tab-active" : ""}`}
						aria-pressed={outputFormat === "png"}
						onClick={() => setOutputFormat("png")}
					>
						PNG
					</button>
					<button
						type="button"
						className={`workspace-tab${outputFormat === "jpg" ? " workspace-tab-active" : ""}`}
						aria-pressed={outputFormat === "jpg"}
						onClick={() => setOutputFormat("jpg")}
					>
						JPG
					</button>
				</div>
			</section>

			<section className="upload-shell">
				<ImageUploadZone
					disabled={isConverting}
					isAddingFiles={isAddingFiles}
					onFilesSelected={(files) => {
						if (files) {
							void addFiles(files);
						}
					}}
				/>
			</section>

			<section className="card section-card image-session-card">
				<div className="section-heading">
					<div className="image-session-copy">
						<strong>Управление сессией</strong>
						<p>
							Добавляйте файлы, запускайте пакет и очищайте текущую очередь.
						</p>
					</div>
					<button
						type="button"
						className="secondary-button"
						disabled={counts.total === 0 && issues.length === 0}
						onClick={clearSession}
					>
						Очистить
					</button>
				</div>

				<div className="image-session-stats" aria-label="Сводка очереди">
					<span className="status-pill">Всего: {counts.total}</span>
					<span className="status-pill">Файлов в очереди: {counts.queued}</span>
					<span className="status-pill">Готово: {counts.done}</span>
					<span className="status-pill">Ошибок: {counts.failed}</span>
				</div>

				<div className="section-heading-actions">
					<button
						type="button"
						className="primary-button"
						disabled={counts.queued === 0 || isConverting}
						onClick={startConversion}
					>
						{isConverting ? "Конвертация..." : "Запустить конвертацию"}
					</button>
					<button
						type="button"
						className="secondary-button"
						disabled={counts.failed === 0 || isConverting}
						onClick={rerunFailedItems}
					>
						Повторить ошибки ({counts.failed})
					</button>
				</div>

				{errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

				{issues.length > 0 ? (
					<ul className="issue-list">
						{issues.map((issue) => (
							<li key={`${issue.fileName}-${issue.reason}`}>
								<strong>{issue.fileName}</strong>
								<span>{issue.reason}</span>
							</li>
						))}
					</ul>
				) : null}
			</section>

			<div className="image-convert-dashboard">
				<ConversionSummary
					counts={counts}
					outputFormat={outputFormat}
					progress={progress}
					isConverting={isConverting}
				/>
				<ArchiveDownloadPanel archive={archive} archiveUrl={archiveUrl} />
			</div>

			<ConversionStatusList
				items={items}
				isConverting={isConverting}
				onRerunFailedItems={rerunFailedItems}
			/>
		</div>
	);
}

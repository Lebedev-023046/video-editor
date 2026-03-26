import { useImageConvert } from "../model/use-image-convert";
import { ImageUploadZone } from "./ImageUploadZone";

export function ImageConvertTab() {
	const {
		outputFormat,
		items,
		counts,
		issues,
		isAddingFiles,
		addFiles,
		clearSession,
		setOutputFormat,
	} = useImageConvert();

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
						<strong>Сессия</strong>
						<p>Формат вывода: {outputFormat.toUpperCase()}</p>
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

				{items.length > 0 ? (
					<ul className="image-queue-list">
						{items.map((item) => (
							<li key={item.id} className="image-queue-item">
								<div>
									<strong>{item.name}</strong>
									<p>{Math.max(1, Math.round(item.size / 1024))} KB</p>
								</div>
								<span className="status-pill">Queued</span>
							</li>
						))}
					</ul>
				) : (
					<div className="empty-state">
						<strong>Очередь пуста</strong>
						<p>
							Добавьте HEIC-изображения, чтобы подготовить пакет к конвертации.
						</p>
					</div>
				)}
			</section>
		</div>
	);
}

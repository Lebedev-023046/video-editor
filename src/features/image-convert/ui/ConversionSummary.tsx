import type {
    ImageConvertSessionCounts,
    ImageOutputFormat,
} from "../model/image-convert-types";

interface ConversionSummaryProps {
	counts: ImageConvertSessionCounts;
	outputFormat: ImageOutputFormat;
	progress:
		| {
				processedItems: number;
				totalItems: number;
				currentFileName: string | null;
				message: string;
		  }
		| null;
	isConverting: boolean;
}

function getCompletionPercent(counts: ImageConvertSessionCounts) {
	if (counts.total === 0) {
		return 0;
	}

	return Math.round(((counts.done + counts.failed) / counts.total) * 100);
}

export function ConversionSummary({
	counts,
	outputFormat,
	progress,
	isConverting,
}: ConversionSummaryProps) {
	const completionPercent = getCompletionPercent(counts);

	return (
		<section className="card section-card image-summary-card">
			<div className="section-heading image-summary-heading">
				<div className="image-session-copy">
					<strong>Сводка пакета</strong>
					<p>Формат вывода: {outputFormat.toUpperCase()}</p>
				</div>
				<span className="status-pill image-progress-pill">
					Прогресс: {completionPercent}%
				</span>
			</div>

			<div className="image-summary-grid" aria-label="Сводка конвертации">
				<article className="image-summary-stat">
					<span>Всего</span>
					<strong>{counts.total}</strong>
				</article>
				<article className="image-summary-stat">
					<span>В очереди</span>
					<strong>{counts.queued}</strong>
				</article>
				<article className="image-summary-stat">
					<span>В работе</span>
					<strong>{counts.converting}</strong>
				</article>
				<article className="image-summary-stat">
					<span>Готово</span>
					<strong>{counts.done}</strong>
				</article>
				<article className="image-summary-stat">
					<span>Ошибки</span>
					<strong>{counts.failed}</strong>
				</article>
				<article className="image-summary-stat">
					<span>Формат</span>
					<strong>{outputFormat.toUpperCase()}</strong>
				</article>
			</div>

			<div
				className="image-progress-track"
				role="progressbar"
				aria-label="Общий прогресс конвертации"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={completionPercent}
			>
				<div
					className="image-progress-fill"
					style={{ width: `${completionPercent}%` }}
				/>
			</div>

			<div className="image-progress-card">
				<strong>
					{progress?.message ??
						(counts.total === 0
							? "Добавьте HEIC-файлы, чтобы подготовить пакет."
							: isConverting
								? "Конвертация выполняется."
								: "Пакет готов к запуску.")}
				</strong>
				<p>
					{progress
						? `${progress.processedItems}/${progress.totalItems}${
								progress.currentFileName
									? ` • ${progress.currentFileName}`
									: ""
							}`
						: `Готово: ${counts.done} • Ошибки: ${counts.failed}`}
				</p>
			</div>
		</section>
	);
}

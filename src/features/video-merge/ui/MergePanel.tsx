import type { MergeViewState } from "../model/merge-status";

interface MergePanelProps {
	canMerge: boolean;
	isMerging: boolean;
	status: MergeViewState;
	hint?: string | null;
	totalSizeLabel?: string | null;
	onMerge: () => void;
}

export function MergePanel({
	canMerge,
	isMerging,
	status,
	hint,
	totalSizeLabel,
	onMerge,
}: MergePanelProps) {
	const progress =
		status.type === "processing" && typeof status.progress === "number"
			? Math.max(0, Math.min(100, Math.round(status.progress * 100)))
			: null;
	const countLabel =
		status.type === "processing" &&
		typeof status.processedItems === "number" &&
		typeof status.totalItems === "number" &&
		status.totalItems > 0
			? `${status.processedItems}/${status.totalItems} видео`
			: null;

	return (
		<section className="merge-status-bar">
			<div
				className={`merge-status-card merge-status-card-${status.type} merge-status-card-compact`}
			>
				<div className="merge-status-inline">
					<span
						className={`merge-status-dot merge-status-dot-${status.type}`}
					/>
					<strong className="merge-status-title">
						{status.type === "processing"
							? "Обработка"
							: status.type === "success"
								? "Готово"
								: status.type === "error"
									? "Ошибка"
									: "Статус"}
					</strong>
					{status.label ? (
						<p className={`merge-status-copy merge-status-copy-${status.type}`}>
							{status.label}
						</p>
					) : null}
				</div>
				{progress !== null || countLabel ? (
					<div className="merge-progress-stats">
						{progress !== null ? (
							<span className="merge-progress-value">{progress}%</span>
						) : null}
						{countLabel ? (
							<span className="merge-progress-count">{countLabel}</span>
						) : null}
					</div>
				) : null}
				{progress !== null ? (
					<div
						className="merge-progress"
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={progress}
						aria-label="Прогресс обработки"
					>
						<span
							className="merge-progress-bar"
							style={{ width: `${progress}%` }}
						/>
					</div>
				) : null}
				<div className="merge-status-meta">
					{hint ? <span className="merge-hint">{hint}</span> : null}
					{totalSizeLabel ? (
						<span className="merge-total-size">{totalSizeLabel}</span>
					) : null}
				</div>
			</div>
			<button
				type="button"
				className="primary-button merge-action-button"
				disabled={!canMerge}
				onClick={onMerge}
			>
				{isMerging ? "Обработка..." : "Объединить"}
			</button>
		</section>
	);
}

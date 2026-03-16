import { useLayoutEffect, useRef, useState } from "react";

import type { MergeViewState } from "../model/merge-status";

interface MergePanelProps {
	canMerge: boolean;
	isMerging: boolean;
	status: MergeViewState;
	hint?: string | null;
	onMerge: () => void;
}

export function MergePanel({
	canMerge,
	isMerging,
	status,
	hint,
	onMerge,
}: MergePanelProps) {
	const inlineContentRef = useRef<HTMLDivElement | null>(null);
	const [cardWidth, setCardWidth] = useState<number | null>(null);

	const progress =
		status.type === "processing" && typeof status.progress === "number"
			? Math.max(6, Math.min(100, Math.round(status.progress * 100)))
			: null;

	useLayoutEffect(() => {
		const element = inlineContentRef.current;

		if (!element) {
			return;
		}

		const updateWidth = () => {
			const nextWidth = Math.ceil(element.scrollWidth + 36);
			setCardWidth(nextWidth);
		};

		updateWidth();

		const observer = new ResizeObserver(() => {
			updateWidth();
		});

		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	}, [status.label, status.type]);

	return (
		<section className="merge-status-bar">
			<div
				className={`merge-status-card merge-status-card-${status.type} merge-status-card-compact`}
				style={cardWidth ? { width: `${cardWidth}px` } : undefined}
			>
				<div className="merge-status-inline" ref={inlineContentRef}>
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
				{hint ? <span className="merge-hint">{hint}</span> : null}
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

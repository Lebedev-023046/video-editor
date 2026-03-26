import { useDeferredValue, useEffect, useMemo, useState } from "react";

import type {
    ImageConvertFileStatus,
    ImageConvertItem,
} from "../model/image-convert-types";

const FILTER_OPTIONS = [
	{ key: "all", label: "All" },
	{ key: "queued", label: "Queued" },
	{ key: "converting", label: "Converting" },
	{ key: "done", label: "Done" },
	{ key: "failed", label: "Failed" },
] as const;

const ROW_HEIGHT = 88;
const MAX_VISIBLE_ROWS = 7;
const OVERSCAN_ROWS = 4;

type StatusFilter = (typeof FILTER_OPTIONS)[number]["key"];

interface ConversionStatusListProps {
	items: ImageConvertItem[];
	isConverting: boolean;
	onRerunFailedItems: () => void;
}

function getStatusLabel(status: ImageConvertFileStatus) {
	switch (status) {
		case "queued":
			return "Queued";
		case "converting":
			return "Converting";
		case "done":
			return "Done";
		case "failed":
			return "Failed";
	}
}

function getFilterCount(items: ImageConvertItem[], filter: StatusFilter) {
	if (filter === "all") {
		return items.length;
	}

	return items.filter((item) => item.status === filter).length;
}

export function ConversionStatusList({
	items,
	isConverting,
	onRerunFailedItems,
}: ConversionStatusListProps) {
	const [filter, setFilter] = useState<StatusFilter>("all");
	const [scrollTop, setScrollTop] = useState(0);
	const deferredItems = useDeferredValue(items);
	const filteredItems = useMemo(
		() =>
			filter === "all"
				? deferredItems
				: deferredItems.filter((item) => item.status === filter),
		[deferredItems, filter],
	);
	const failedCount = getFilterCount(items, "failed");
	const viewportHeight = ROW_HEIGHT * Math.min(MAX_VISIBLE_ROWS, filteredItems.length || 1);
	const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
	const visibleCount =
		Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN_ROWS * 2;
	const endIndex = Math.min(filteredItems.length, startIndex + visibleCount);
	const visibleItems = filteredItems.slice(startIndex, endIndex);
	const offsetTop = startIndex * ROW_HEIGHT;

	useEffect(() => {
		setScrollTop(0);
	}, [filter]);

	return (
		<section className="card section-card image-status-card">
			<div className="section-heading image-status-heading">
				<div className="image-session-copy">
					<strong>Статусы файлов</strong>
					<p>Фильтруйте очередь и повторно запускайте только неудачные элементы.</p>
				</div>
				<button
					type="button"
					className="secondary-button"
					disabled={failedCount === 0 || isConverting}
					onClick={onRerunFailedItems}
				>
					Повторить ошибки ({failedCount})
				</button>
			</div>

			<div
				className="image-filter-group"
				role="tablist"
				aria-label="Фильтр статусов"
			>
				{FILTER_OPTIONS.map((option) => (
					<button
						key={option.key}
						type="button"
						role="tab"
						className={`workspace-tab${filter === option.key ? " workspace-tab-active" : ""}`}
						aria-selected={filter === option.key}
						onClick={() => setFilter(option.key)}
					>
						{option.label} ({getFilterCount(items, option.key)})
					</button>
				))}
			</div>

			{items.length === 0 ? (
				<div className="empty-state">
					<strong>Очередь пуста</strong>
					<p>Добавьте HEIC-изображения, чтобы увидеть статусы файлов.</p>
				</div>
			) : filteredItems.length === 0 ? (
				<div className="empty-state">
					<strong>По этому фильтру пока ничего нет</strong>
					<p>Смените фильтр или запустите конвертацию текущей очереди.</p>
				</div>
			) : (
				<div className="image-status-shell">
					<div className="image-status-list-header" aria-hidden="true">
						<span>Файл</span>
						<span>Статус</span>
					</div>
					<div
						className="image-status-viewport"
						style={{ height: `${viewportHeight}px` }}
						onScroll={(event) => {
							setScrollTop(event.currentTarget.scrollTop);
						}}
					>
						<div
							className="image-status-spacer"
							style={{ height: `${filteredItems.length * ROW_HEIGHT}px` }}
						>
							<div
								className="image-status-offset"
								style={{ transform: `translateY(${offsetTop}px)` }}
							>
								<ul className="image-status-list">
									{visibleItems.map((item) => (
										<li key={item.id} className="image-status-row">
											<div className="image-status-meta">
												<strong>{item.name}</strong>
												<p>
													{Math.max(1, Math.round(item.size / 1024))} KB
													{item.errorMessage
														? ` • ${item.errorMessage}`
														: ""}
												</p>
											</div>
											<span
												className={`status-pill image-status-badge image-status-${item.status}`}
											>
												{getStatusLabel(item.status)}
											</span>
										</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}

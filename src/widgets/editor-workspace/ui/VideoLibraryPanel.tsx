import type { VideoItem } from "../../../entities/video-item";

interface VideoLibraryPanelProps {
	items: VideoItem[];
	isRestoring: boolean;
	onRemove: (id: string) => void;
}

function formatFileSize(size: number) {
	if (size < 1024 * 1024) {
		return `${Math.round(size / 1024)} KB`;
	}

	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoLibraryPanel({
	items,
	isRestoring,
	onRemove,
}: VideoLibraryPanelProps) {
	return (
		<section className="card section-card">
			<div className="section-heading">
				<div>
					<h2>Видео</h2>
				</div>
				<span className="status-pill">{items.length}</span>
			</div>

			{isRestoring ? <p className="meta-copy">Восстановление...</p> : null}

			{!isRestoring && items.length === 0 ? (
				<div className="empty-state">
					<strong>Пока пусто</strong>
					<p>Добавьте видео.</p>
				</div>
			) : null}

			{items.length > 0 ? (
				<ul className="video-list">
					{items.map((item, index) => (
						<li key={item.id} className="video-list-item">
							<div className="video-list-meta">
								<span className="video-order">{index + 1}</span>
								<div>
									<strong>{item.name}</strong>
									<p>
										{item.mimeType} · {formatFileSize(item.size)}
									</p>
								</div>
							</div>
							<button
								type="button"
								className="secondary-button danger-button"
								onClick={() => {
									void onRemove(item.id);
								}}
							>
								Удалить
							</button>
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}

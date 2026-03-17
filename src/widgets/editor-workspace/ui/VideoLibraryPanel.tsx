import type { VideoItem } from "../../../entities/video-item";
import { formatFileSize } from "../../shared/lib/format-file-size";

interface VideoLibraryPanelProps {
	items: VideoItem[];
	isSaving: boolean;
	onRemove: (id: string) => void;
	onRemoveAll: () => void;
}

export function VideoLibraryPanel({
	items,
	isSaving,
	onRemove,
	onRemoveAll,
}: VideoLibraryPanelProps) {
	return (
		<section className="card section-card">
			<div className="section-heading">
				<div>
					<h2>Видео</h2>
				</div>
				<div className="section-heading-actions">
					{items.length > 0 ? (
						<button
							type="button"
							className="secondary-button danger-button"
							disabled={isSaving}
							onClick={() => {
								void onRemoveAll();
							}}
						>
							Удалить все
						</button>
					) : null}
					<span className="status-pill">{items.length}</span>
				</div>
			</div>

			{items.length === 0 ? (
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

import {
	DragDropContext,
	Draggable,
	Droppable,
	type DropResult,
} from "@hello-pangea/dnd";
import { createPortal } from "react-dom";

import type { VideoItem } from "../../../entities/video-item";
import { formatFileSize } from "../../shared/lib/format-file-size";

interface VideoLibraryPanelProps {
	items: VideoItem[];
	isSaving: boolean;
	onRemove: (id: string) => void;
	onRemoveAll: () => void;
	onReorder: (sourceIndex: number, destinationIndex: number) => void;
}

export function VideoLibraryPanel({
	items,
	isSaving,
	onRemove,
	onRemoveAll,
	onReorder,
}: VideoLibraryPanelProps) {
	function handleDragEnd(result: DropResult) {
		if (!result.destination) {
			return;
		}

		if (result.source.index === result.destination.index) {
			return;
		}

		void onReorder(result.source.index, result.destination.index);
	}

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
				<DragDropContext onDragEnd={handleDragEnd}>
					<Droppable droppableId="video-library-droppable">
						{(droppableProvided) => (
							<ul
								ref={droppableProvided.innerRef}
								className="video-list"
								{...droppableProvided.droppableProps}
							>
								{items.map((item, index) => (
									<Draggable
										key={item.id}
										draggableId={item.id}
										index={index}
										isDragDisabled={isSaving}
									>
										{(draggableProvided, snapshot) => {
											const content = (
												<li
													ref={draggableProvided.innerRef}
													className={`video-list-item${snapshot.isDragging ? " video-list-item-dragging" : ""}`}
													{...draggableProvided.draggableProps}
													{...draggableProvided.dragHandleProps}
												>
													<div className="video-list-meta">
														<span className="drag-handle" aria-hidden="true">
															::
														</span>
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
											);

											if (snapshot.isDragging) {
												return createPortal(content, document.body);
											}

											return content;
										}}
									</Draggable>
								))}
								{droppableProvided.placeholder}
							</ul>
						)}
					</Droppable>
				</DragDropContext>
			) : null}
		</section>
	);
}

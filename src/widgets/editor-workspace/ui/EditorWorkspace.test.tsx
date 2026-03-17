import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VideoItem } from "../../../entities/video-item";
import type { MergeViewState } from "../../../features/video-merge/model/merge-status";
import { EditorWorkspace } from "./EditorWorkspace";

const { useVideoUploadMock, useVideoMergeMock } = vi.hoisted(() => ({
	useVideoUploadMock: vi.fn(),
	useVideoMergeMock: vi.fn(),
}));

vi.mock("../../../features/video-upload", async () => {
	const actual = await vi.importActual<object>(
		"../../../features/video-upload",
	);
	return {
		...actual,
		useVideoUpload: useVideoUploadMock,
	};
});

vi.mock("../../../features/video-merge", async () => {
	const actual = await vi.importActual<object>("../../../features/video-merge");
	return {
		...actual,
		useVideoMerge: useVideoMergeMock,
	};
});

function createItem(id: string, order: number): VideoItem {
	return {
		id,
		name: `clip-${id}.mp4`,
		mimeType: "video/mp4",
		size: 1024,
		persistedAt: "2026-03-17T10:00:00.000Z",
		storageKey: `clip-${id}.mp4`,
		order,
	};
}

function createStatus(overrides: Partial<MergeViewState> = {}): MergeViewState {
	return {
		type: "idle",
		label: "Можно объединять",
		...overrides,
	} as MergeViewState;
}

describe("EditorWorkspace", () => {
	beforeEach(() => {
		useVideoUploadMock.mockReset();
		useVideoMergeMock.mockReset();
	});

	it("renders the ordered library, forwards uploads, and enables merge when ready", () => {
		const addFiles = vi.fn().mockResolvedValue(undefined);
		const startMerge = vi.fn();
		useVideoUploadMock.mockReturnValue({
			items: [createItem("a", 0), createItem("b", 1)],
			isRestoring: false,
			isSaving: false,
			errorMessage: null,
			uploadIssues: [],
			addFiles,
			removeItem: vi.fn(),
		});
		useVideoMergeMock.mockReturnValue({
			canMerge: true,
			isMerging: false,
			precheckIssue: null,
			resultFile: null,
			status: createStatus(),
			startMerge,
		});

		const { container } = render(<EditorWorkspace />);
		const fileInput = container.querySelector('input[type="file"]');

		expect(screen.getByText("clip-a.mp4")).toBeInTheDocument();
		expect(screen.getByText("clip-b.mp4")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Объединить" })).toBeEnabled();

		fireEvent.change(fileInput as HTMLInputElement, {
			target: {
				files: [new File(["video"], "fresh.mp4", { type: "video/mp4" })],
			},
		});
		fireEvent.click(screen.getByRole("button", { name: "Объединить" }));

		expect(addFiles).toHaveBeenCalledTimes(1);
		expect(startMerge).toHaveBeenCalledTimes(1);
	});

	it("shows upload issues and the download action when a merged file exists", () => {
		useVideoUploadMock.mockReturnValue({
			items: [createItem("a", 0), createItem("b", 1)],
			isRestoring: false,
			isSaving: false,
			errorMessage: "Не удалось сохранить видео в браузере.",
			uploadIssues: [
				{ fileName: "note.txt", reason: "Файл не является видео." },
			],
			addFiles: vi.fn(),
			removeItem: vi.fn(),
		});
		useVideoMergeMock.mockReturnValue({
			canMerge: false,
			isMerging: false,
			precheckIssue: null,
			resultFile: new File(["merged"], "clip-a-merged.mp4", {
				type: "video/mp4",
			}),
			status: createStatus({ type: "success", label: "" }),
			startMerge: vi.fn(),
		});

		render(<EditorWorkspace />);

		expect(
			screen.getByText("Не удалось сохранить видео в браузере."),
		).toBeInTheDocument();
		expect(screen.getByText("note.txt")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Скачать результат" }),
		).toHaveAttribute("download", "clip-a-merged.mp4");
	});
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ImageConvertTab } from "./ImageConvertTab";

const hookState = vi.fn();

vi.mock("../model/use-image-convert", () => ({
	useImageConvert: () => hookState(),
}));

describe("ImageConvertTab", () => {
	it("forwards uploads and session actions to the hook", () => {
		const addFiles = vi.fn();
		const clearSession = vi.fn();
		const startConversion = vi.fn();

		hookState.mockReturnValue({
			outputFormat: "png",
			items: [
				{
					id: "a",
					name: "queued.heic",
					size: 1024,
					mimeType: "image/heic",
					file: new File(["a"], "queued.heic", { type: "image/heic" }),
					status: "queued",
					errorMessage: null,
					outputFileName: null,
					outputMimeType: null,
					outputFile: null,
					sessionOrder: 0,
				},
			],
			counts: { total: 1, queued: 1, converting: 0, done: 0, failed: 0 },
			issues: [],
			isAddingFiles: false,
			isConverting: false,
			progress: null,
			errorMessage: null,
			archive: {
				isReady: false,
				fileName: null,
				file: null,
				successfulCount: 0,
				failedCount: 0,
			},
			addFiles,
			clearSession,
			setOutputFormat: vi.fn(),
			startConversion,
			rerunFailedItems: vi.fn(),
		});

		render(<ImageConvertTab />);

		fireEvent.change(screen.getByLabelText("Добавить HEIC"), {
			target: {
				files: [new File(["img"], "fresh.heic", { type: "image/heic" })],
			},
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Запустить конвертацию" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Очистить" }));

		expect(addFiles).toHaveBeenCalledTimes(1);
		expect(startConversion).toHaveBeenCalledTimes(1);
		expect(clearSession).toHaveBeenCalledTimes(1);
	});

	it("renders the upload zone, summary dashboard, and unavailable archive state", () => {
		hookState.mockReturnValue({
			outputFormat: "png",
			items: [],
			counts: { total: 0, queued: 0, converting: 0, done: 0, failed: 0 },
			issues: [],
			isAddingFiles: false,
			isConverting: false,
			progress: null,
			errorMessage: null,
			archive: {
				isReady: false,
				fileName: null,
				file: null,
				successfulCount: 0,
				failedCount: 0,
			},
			addFiles: vi.fn(),
			clearSession: vi.fn(),
			setOutputFormat: vi.fn(),
			startConversion: vi.fn(),
			rerunFailedItems: vi.fn(),
		});

		render(<ImageConvertTab />);

		expect(
			screen.getByRole("heading", { name: "Конвертация изображений" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "PNG" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByText("Прогресс: 0%")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Архив станет доступен после хотя бы одной успешной конвертации.",
			),
		).toBeInTheDocument();
		expect(screen.getByText("Пока недоступен")).toBeInTheDocument();
	});

	it("supports filtering failed items and shows partial archive download state", () => {
		const setOutputFormat = vi.fn();
		const rerunFailedItems = vi.fn();

		hookState.mockReturnValue({
			outputFormat: "png",
			items: [
				{
					id: "a",
					name: "first.heic",
					size: 1024,
					mimeType: "image/heic",
					file: new File(["a"], "first.heic", { type: "image/heic" }),
					status: "done",
					errorMessage: null,
					outputFileName: "first.png",
					outputMimeType: "image/png",
					outputFile: new File(["png"], "first.png", { type: "image/png" }),
					sessionOrder: 0,
				},
				{
					id: "b",
					name: "second.heic",
					size: 2048,
					mimeType: "image/heic",
					file: new File(["b"], "second.heic", { type: "image/heic" }),
					status: "failed",
					errorMessage: "Изображение не удалось прочитать.",
					outputFileName: null,
					outputMimeType: null,
					outputFile: null,
					sessionOrder: 1,
				},
			],
			counts: { total: 2, queued: 0, converting: 0, done: 1, failed: 1 },
			issues: [
				{
					fileName: "image.png",
					reason: "Поддерживаются только HEIC-изображения.",
				},
			],
			isAddingFiles: false,
			isConverting: false,
			progress: {
				processedItems: 1,
				totalItems: 2,
				currentFileName: "first.heic",
				message: "Конвертация 1/2",
			},
			errorMessage: null,
			archive: {
				isReady: true,
				fileName: "converted.zip",
				file: new File(["zip"], "converted.zip", { type: "application/zip" }),
				successfulCount: 1,
				failedCount: 1,
			},
			addFiles: vi.fn(),
			clearSession: vi.fn(),
			setOutputFormat,
			startConversion: vi.fn(),
			rerunFailedItems,
		});

		render(<ImageConvertTab />);

		fireEvent.click(screen.getByRole("button", { name: "JPG" }));
		fireEvent.click(screen.getByRole("tab", { name: "Failed (1)" }));
		fireEvent.click(
			screen.getAllByRole("button", { name: "Повторить ошибки (1)" })[1],
		);

		expect(setOutputFormat).toHaveBeenCalledWith("jpg");
		expect(rerunFailedItems).toHaveBeenCalledTimes(1);
		expect(
			screen.getByText("Поддерживаются только HEIC-изображения."),
		).toBeInTheDocument();
		expect(
			screen.getByText(/изображение не удалось прочитать\./i),
		).toBeInTheDocument();
		expect(screen.queryByText("first.heic")).not.toBeInTheDocument();
		expect(
			screen.getByText(
				"Готов частичный архив: 1 из 2 файлов. Часть элементов не вошла из-за ошибок конвертации.",
			),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /скачать zip/i })).toHaveAttribute(
			"download",
			"converted.zip",
		);
	});

	it("disables upload and retry actions while conversion is active", () => {
		hookState.mockReturnValue({
			outputFormat: "png",
			items: [
				{
					id: "a",
					name: "first.heic",
					size: 1024,
					mimeType: "image/heic",
					file: new File(["a"], "first.heic", { type: "image/heic" }),
					status: "converting",
					errorMessage: null,
					outputFileName: null,
					outputMimeType: null,
					outputFile: null,
					sessionOrder: 0,
				},
			],
			counts: { total: 1, queued: 0, converting: 1, done: 0, failed: 1 },
			issues: [],
			isAddingFiles: false,
			isConverting: true,
			progress: {
				processedItems: 0,
				totalItems: 1,
				currentFileName: "first.heic",
				message: "Конвертация 1/1",
			},
			errorMessage: null,
			archive: {
				isReady: false,
				fileName: null,
				file: null,
				successfulCount: 0,
				failedCount: 1,
			},
			addFiles: vi.fn(),
			clearSession: vi.fn(),
			setOutputFormat: vi.fn(),
			startConversion: vi.fn(),
			rerunFailedItems: vi.fn(),
		});

		render(<ImageConvertTab />);

		expect(screen.getByLabelText("Добавить HEIC")).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Конвертация..." }),
		).toBeDisabled();
		expect(
			screen.getAllByRole("button", { name: "Повторить ошибки (1)" })[0],
		).toBeDisabled();
	});
});

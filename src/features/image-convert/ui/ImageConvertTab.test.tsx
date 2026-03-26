import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ImageConvertTab } from "./ImageConvertTab";

describe("ImageConvertTab", () => {
	it("renders the upload zone, format switch, and queue summary", () => {
		render(<ImageConvertTab />);

		expect(
			screen.getByRole("heading", { name: "Конвертация изображений" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "PNG" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(screen.getByText("Файлов в очереди: 0")).toBeInTheDocument();
	});

	it("switches output format and lists upload issues", () => {
		render(<ImageConvertTab />);

		fireEvent.click(screen.getByRole("button", { name: "JPG" }));

		const input = screen.getByLabelText("Добавить HEIC") as HTMLInputElement;
		fireEvent.change(input, {
			target: {
				files: [new File(["bad"], "image.png", { type: "image/png" })],
			},
		});

		expect(screen.getByRole("button", { name: "JPG" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		expect(
			screen.getByText("Поддерживаются только HEIC-изображения."),
		).toBeInTheDocument();
	});
});

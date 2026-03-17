import "@testing-library/jest-dom";
import { vi } from "vitest";

class ResizeObserverMock {
	disconnect() {}

	observe() {}

	unobserve() {}
}

if (!("ResizeObserver" in globalThis)) {
	Object.defineProperty(globalThis, "ResizeObserver", {
		value: ResizeObserverMock,
		writable: true,
	});
}

if (!("createObjectURL" in URL)) {
	Object.defineProperty(URL, "createObjectURL", {
		value: vi.fn(() => "blob:mock-url"),
		writable: true,
	});
}

if (!("revokeObjectURL" in URL)) {
	Object.defineProperty(URL, "revokeObjectURL", {
		value: vi.fn(),
		writable: true,
	});
}

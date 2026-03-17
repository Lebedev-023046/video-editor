import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	base: "./",
	plugins: [react()],
	optimizeDeps: {
		exclude: ["@ffmpeg/ffmpeg"],
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: "./src/widgets/shared/config/test/setup.ts",
	},
});

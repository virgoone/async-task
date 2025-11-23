import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss(), tanstackRouter({}), react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			// 开发模式使用源码，生产模式使用构建后的 dist
			"use-async-task": path.resolve(
				__dirname,
				"../../packages/use-async-task/src/index.ts",
			),
		},
		preserveSymlinks: false,
	},
	optimizeDeps: {
		include: ["use-async-task"],
	},
});

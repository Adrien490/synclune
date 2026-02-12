import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": resolve(__dirname, "."),
			"server-only": resolve(__dirname, "shared/lib/__mocks__/server-only.ts"),
		},
	},
	test: {
		include: ["**/*.test.{ts,tsx}"],
		exclude: ["node_modules", ".next"],
		environment: "jsdom",
	},
});

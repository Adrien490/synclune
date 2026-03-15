import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": resolve(__dirname, "."),
			"server-only": resolve(__dirname, "shared/lib/__mocks__/server-only.ts"),
		},
	},
	css: {
		// Disable PostCSS processing in tests (avoids @tailwindcss/postcss resolution issues)
		postcss: {},
	},
	test: {
		pool: "threads",
		include: ["**/*.test.{ts,tsx}"],
		exclude: ["node_modules", ".next"],
		environment: "jsdom",
		setupFiles: ["./test/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "text-summary", "html", "lcov"],
			include: [
				"modules/**/*.ts",
				"modules/**/*.tsx",
				"shared/**/*.ts",
				"shared/**/*.tsx",
				"app/**/*.ts",
				"app/**/*.tsx",
			],
			exclude: [
				"**/__tests__/**",
				"**/*.test.{ts,tsx}",
				"**/*.d.ts",
				"**/types/**",
				"**/constants/**",
				"node_modules/**",
				"app/**/layout.tsx",
				"app/**/loading.tsx",
				"app/**/error.tsx",
				"app/**/not-found.tsx",
				"app/**/default.tsx",
				"app/**/template.tsx",
				"app/**/opengraph-image.tsx",
				"app/api/**",
				"app/serwist/**",
			],
			thresholds: {
				statements: 70,
				branches: 60,
				functions: 70,
				lines: 70,
				"modules/payments/services/": {
					statements: 80,
					branches: 70,
				},
				"modules/webhooks/": {
					statements: 90,
					branches: 80,
					functions: 85,
				},
				"modules/cron/services/": {
					statements: 90,
					branches: 80,
					functions: 85,
				},
				"modules/orders/services/": {
					statements: 85,
					branches: 75,
				},
				"modules/discounts/services/": {
					statements: 90,
					branches: 80,
					functions: 85,
				},
				"modules/refunds/services/": {
					statements: 85,
					branches: 75,
				},
				"modules/cart/services/": {
					statements: 85,
					branches: 75,
				},
				"shared/utils/": {
					statements: 80,
					branches: 70,
				},
			},
		},
	},
});

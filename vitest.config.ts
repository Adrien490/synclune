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
		exclude: [
			"node_modules",
			".next",
			".claude/worktrees/**",
			"**/*.integration.test.ts", // ran by `pnpm test:integration` against a dedicated DB
		],
		environment: "jsdom",
		setupFiles: ["./test/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "text-summary", "html", "lcov"],
			include: ["modules/**/*.ts", "modules/**/*.tsx", "shared/**/*.ts", "shared/**/*.tsx"],
			exclude: [
				"**/__tests__/**",
				"**/*.test.{ts,tsx}",
				"**/*.d.ts",
				"**/types/**",
				"**/constants/**",
				"node_modules/**",
				"app/**",
				"shared/components/ui/alert-dialog.tsx",
				"shared/components/ui/calendar.tsx",
				"shared/components/ui/carousel.tsx",
				"modules/dashboard/components/chart.tsx",
				"shared/components/ui/checkbox.tsx",
				"shared/components/ui/collapsible.tsx",
				"shared/components/ui/command.tsx",
				"shared/components/ui/dialog.tsx",
				"shared/components/ui/drawer.tsx",
				"shared/components/ui/dropdown-menu.tsx",
				"shared/components/ui/hover-card.tsx",
				"shared/components/ui/navigation-menu.tsx",
				"shared/components/ui/popover.tsx",
				"shared/components/ui/radio-group.tsx",
				"shared/components/ui/scroll-area.tsx",
				"shared/components/ui/select.tsx",
				"shared/components/ui/separator.tsx",
				"shared/components/ui/sheet.tsx",
				"shared/components/ui/sidebar.tsx",
				"shared/components/ui/slider.tsx",
				"shared/components/ui/switch.tsx",
				"shared/components/ui/tabs.tsx",
				"shared/components/ui/textarea.tsx",
				"shared/components/ui/toaster.tsx",
				"shared/components/ui/toggle.tsx",
				"shared/components/ui/tooltip.tsx",
				"shared/components/icons/**",
			],
			thresholds: {
				statements: 84,
				branches: 75,
				functions: 76,
				lines: 84,
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
				"modules/wishlist/actions/": {
					statements: 85,
					branches: 75,
				},
				"modules/emails/services/": {
					statements: 80,
					branches: 65,
				},
			},
		},
	},
});

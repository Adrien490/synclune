import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	globalTeardown: "./e2e/global-teardown.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 4 : undefined,
	timeout: 30_000,
	expect: { timeout: 7_000 },
	reporter: process.env.CI
		? [
				["github"],
				["html", { open: "never" }],
				["list"],
				["./e2e/helpers/flakiness-reporter.ts", { budget: 3 }],
			]
		: [["html"]],
	use: {
		baseURL: process.env.BASE_URL ?? "http://localhost:3000",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: [
		// Setup projects for authentication
		{
			name: "setup",
			testMatch: /auth\.setup\.ts/,
		},

		// Unauthenticated tests - Desktop
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
			testIgnore: /authenticated\//,
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
			testIgnore: /authenticated\//,
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
			testIgnore: /authenticated\//,
		},

		// Unauthenticated tests - Mobile
		{
			name: "mobile-chrome",
			use: { ...devices["Pixel 7"] },
			testIgnore: /authenticated\//,
		},
		{
			name: "mobile-webkit",
			use: { ...devices["iPhone 14"] },
			testIgnore: /authenticated\//,
		},

		// Authenticated tests (admin) - Chrome
		{
			name: "authenticated-admin",
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/admin.json",
			},
			testMatch: /authenticated\/admin/,
			dependencies: ["setup"],
		},

		// Authenticated tests (user) - Chrome
		{
			name: "authenticated-user",
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/user.json",
			},
			testMatch: /authenticated\/user/,
			dependencies: ["setup"],
		},

		// Authenticated tests (user) - Firefox
		// Covers checkout/Stripe iframe differences
		{
			name: "authenticated-user-firefox",
			use: {
				...devices["Desktop Firefox"],
				storageState: "e2e/.auth/user.json",
			},
			testMatch: /authenticated\/user-checkout-flow|authenticated\/user-auth-flows/,
			dependencies: ["setup"],
		},

		// Authenticated tests (user) - WebKit
		// Covers Safari-specific payment/session behavior
		{
			name: "authenticated-user-webkit",
			use: {
				...devices["Desktop Safari"],
				storageState: "e2e/.auth/user.json",
			},
			testMatch: /authenticated\/user-checkout-flow|authenticated\/user-auth-flows/,
			dependencies: ["setup"],
		},
	],
	webServer: {
		command: process.env.CI ? "pnpm start" : "pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		env: {
			ARCJET_MODE: "DRY_RUN",
		},
	},
});

import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: "http://localhost:3000",
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

		// Authenticated tests (admin)
		{
			name: "authenticated-admin",
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/admin.json",
			},
			testMatch: /authenticated\/admin/,
			dependencies: ["setup"],
		},

		// Authenticated tests (user)
		{
			name: "authenticated-user",
			use: {
				...devices["Desktop Chrome"],
				storageState: "e2e/.auth/user.json",
			},
			testMatch: /authenticated\/user/,
			dependencies: ["setup"],
		},
	],
	webServer: {
		command: process.env.CI ? "pnpm start" : "pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
	},
})

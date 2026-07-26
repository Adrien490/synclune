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
			testIgnore: [/authenticated\//, /responsive-breakpoints/],
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
			testIgnore: [/authenticated\//, /responsive-breakpoints/],
		},

		// Unauthenticated tests - Mobile
		{
			name: "mobile-chrome",
			use: { ...devices["Pixel 7"] },
			testIgnore: [/authenticated\//, /responsive-breakpoints/],
		},
		{
			name: "mobile-webkit",
			use: { ...devices["iPhone 14"] },
			testIgnore: [/authenticated\//, /responsive-breakpoints/],
		},

		// Unauthenticated tests - Tablette
		// La plage 48-64rem n'était couverte par AUCUN projet (le saut allait de
		// 412px à 1280px), alors que c'est là que les deux barres de navigation
		// basculent à des seuils différents : bottom-nav boutique à `lg`, sidebar
		// admin à `md`. Scopés au responsive pour ne pas doubler la durée de la
		// suite complète (audit responsive 2026-07-26).
		{
			name: "tablet-portrait",
			use: { ...devices["iPad Mini"], viewport: { width: 768, height: 1024 } },
			testMatch: /responsive-breakpoints/,
		},
		{
			name: "tablet-landscape",
			use: {
				...devices["iPad Mini landscape"],
				viewport: { width: 1024, height: 768 },
			},
			testMatch: /responsive-breakpoints|a11y\/zoom-a11y/,
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

		// Authenticated tests (user) - Mobile (iPhone 14)
		// Couvre les flows connectés conversion-critiques en viewport mobile :
		// les autres projets `authenticated-user*` ne tournent qu'en desktop, donc
		// une régression mobile sur panier/checkout/wishlist passait inaperçue.
		{
			name: "authenticated-user-mobile",
			use: {
				...devices["iPhone 14"],
				storageState: "e2e/.auth/user.json",
			},
			testMatch:
				/authenticated\/user-checkout-flow|authenticated\/user-cart-management|authenticated\/user-wishlist/,
			dependencies: ["setup"],
		},
	],
	webServer: {
		command: process.env.CI ? "pnpm start" : "pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
	},
});

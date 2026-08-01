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

		/**
		 * Plus de projets `authenticated-user*` (retrait de l'espace client 2026-07-31).
		 *
		 * Les cinq variantes (Chrome, Firefox, WebKit, mobile) chargeaient
		 * `e2e/.auth/user.json`, un état de session obtenu en connectant un compte
		 * CLIENT. Ce compte ne peut plus exister : l'inscription est fermée
		 * (`disableSignUp`) et seule l'administratrice se connecte.
		 *
		 * Les specs commerce qu'ils couvraient (panier, checkout, wishlist, facture,
		 * échec de paiement, paiement asynchrone, parcours clavier) ont migré vers
		 * `e2e/*.spec.ts` et tournent dans les projets invités — ce qui correspond
		 * désormais au parcours réel de TOUS les clients. Le multi-navigateur du
		 * checkout (différences d'iframe Stripe) reste couvert par les projets
		 * `firefox` et `webkit`, et le mobile par `mobile-chrome` / `mobile-webkit`.
		 *
		 * `authenticated-admin` reste : c'est la seule session possible.
		 */
	],
	webServer: {
		command: process.env.CI ? "pnpm start" : "pnpm dev",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
	},
});

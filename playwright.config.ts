import { defineConfig, devices } from "@playwright/test";

/**
 * Matrice de navigateurs : COMPLÈTE en CI, réduite en local.
 *
 * En local, `pnpm e2e` lançait les 5 projets navigateurs sur ~390 tests, soit
 * ~1 950 exécutions et ~11 min de 4 workers à saturer le CPU d'un portable —
 * pour une boutique française, en français, à ~20 commandes/mois. Le retour sur
 * investissement de Firefox desktop y est quasi nul, et les divergences WebKit
 * comme les régressions visuelles se voient très bien sur la machine de CI,
 * dont c'est le métier de chauffer.
 *
 * Par défaut en local : chromium + admin + les deux projets tablette (scopés au
 * seul `responsive-breakpoints`, donc ~14 tests). Pour reproduire la matrice
 * complète en local — bug WebKit à confirmer, mise à jour de snapshots —
 * `E2E_ALL_BROWSERS=1 pnpm e2e`.
 */
const fullMatrix = !!process.env.CI || process.env.E2E_ALL_BROWSERS === "1";

export default defineConfig({
	testDir: "./e2e",
	// Fige TEST_RUN_ID avant le spawn des workers — cf. e2e/global-setup.ts.
	globalSetup: "./e2e/global-setup.ts",
	globalTeardown: "./e2e/global-teardown.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	// 1 retry en local (2 en CI) : sur ~1980 tests, la queue de flakes de charge
	// (hydratation, goto interrompu, focus volé) fait échouer 1-3 tests PAR RUN,
	// jamais les mêmes — mesuré sur 12 runs complets au lot 7. Un test repêché
	// reste SIGNALÉ « flaky » dans le résumé : rien n'est masqué.
	retries: process.env.CI ? 2 : 1,
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
			testIgnore: [/authenticated\//, /__tests__\//],
		},
		...(fullMatrix
			? [
					{
						name: "firefox",
						use: { ...devices["Desktop Firefox"] },
						testIgnore: [/authenticated\//, /responsive-breakpoints/, /__tests__\//],
					},
				]
			: []),
		...(fullMatrix
			? [
					{
						name: "webkit",
						use: { ...devices["Desktop Safari"] },
						testIgnore: [/authenticated\//, /responsive-breakpoints/, /__tests__\//],
					},
					// Unauthenticated tests - Mobile
					{
						name: "mobile-chrome",
						use: { ...devices["Pixel 7"] },
						testIgnore: [/authenticated\//, /responsive-breakpoints/, /__tests__\//],
					},
					{
						name: "mobile-webkit",
						use: { ...devices["iPhone 14"] },
						testIgnore: [/authenticated\//, /responsive-breakpoints/, /__tests__\//],
					},
				]
			: []),

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
		// Le seed picsum doit passer l'optimiseur d'images même en build prod
		// (cf. le commentaire du flag dans next.config.ts) ; et les cookies ne
		// doivent pas être `Secure` quand la suite parle en http://localhost —
		// WebKit les refuse en silence (cf. shared/lib/cookie-security.ts).
		env: { E2E_ALLOW_SEED_IMAGES: "1", E2E_INSECURE_COOKIES: "1" },
	},
});

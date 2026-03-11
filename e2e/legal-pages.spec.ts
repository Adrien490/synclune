import { test, expect } from "./fixtures";

const LEGAL_PAGES = [
	{
		path: "/cgv",
		heading: /Conditions Générales de Vente|CGV/i,
		contentCheck: /Article|livraison|paiement|rétractation/i,
	},
	{
		path: "/confidentialite",
		heading: /Politique de Confidentialité|Confidentialité/i,
		contentCheck: /RGPD|données personnelles|responsable|traitement/i,
	},
	{
		path: "/cookies",
		heading: /Cookies/i,
		contentCheck: /cookie|localStorage|navigation|consentement/i,
	},
	{
		path: "/mentions-legales",
		heading: /Mentions Légales/i,
		contentCheck: /éditeur|hébergement|SIREN|SIRET|directeur/i,
	},
	{
		path: "/retractation",
		heading: /Rétractation/i,
		contentCheck: /14 jours|droit de rétractation|formulaire|retour/i,
	},
	{
		path: "/accessibilite",
		heading: /Accessibilité/i,
		contentCheck: /WCAG|clavier|lecteur d'écran|contraste/i,
	},
	{
		path: "/informations-legales",
		heading: /Informations Légales/i,
		contentCheck: /CGV|confidentialité|mentions|cookies/i,
	},
] as const;

test.describe("Pages légales", { tag: ["@regression"] }, () => {
	for (const legalPage of LEGAL_PAGES) {
		test(`${legalPage.path} - charge et affiche le contenu`, async ({ page }) => {
			await page.goto(legalPage.path);
			await page.waitForLoadState("domcontentloaded");

			// Heading visible
			const heading = page.getByRole("heading", { name: legalPage.heading });
			await expect(heading.first()).toBeVisible();

			// Content present
			const body = await page.textContent("body");
			expect(body).toMatch(legalPage.contentCheck);
		});

		test(`${legalPage.path} - possède les métadonnées`, async ({ page }) => {
			await page.goto(legalPage.path);
			await page.waitForLoadState("domcontentloaded");

			// Title
			const title = await page.title();
			expect(title.length).toBeGreaterThan(0);

			// Meta description
			const metaDescription = page.locator('meta[name="description"]');
			await expect(metaDescription).toBeAttached();
		});
	}

	test("/a-propos redirige vers l'accueil", async ({ page }) => {
		const response = await page.goto("/a-propos", {
			waitUntil: "domcontentloaded",
		});
		// 308 permanent redirect to /
		expect(response?.url()).toMatch(/\/$/);
	});

	test("/informations-legales affiche les liens vers toutes les pages", async ({ page }) => {
		await page.goto("/informations-legales");
		await page.waitForLoadState("domcontentloaded");

		const legalLinks = [
			/CGV|Conditions Générales/i,
			/Confidentialité/i,
			/Cookies/i,
			/Mentions Légales/i,
			/Rétractation/i,
			/Accessibilité/i,
		];

		for (const linkText of legalLinks) {
			const link = page.getByRole("link", { name: linkText });
			await expect(link.first()).toBeAttached();
		}
	});

	test("/cgv contient les sections numérotées", async ({ page }) => {
		await page.goto("/cgv");
		await page.waitForLoadState("domcontentloaded");

		// Should have multiple section headings
		const headings = page.getByRole("heading", { level: 2 });
		const headingCount = await headings.count();
		expect(headingCount).toBeGreaterThanOrEqual(10);
	});

	test("/confidentialite mentionne les droits RGPD", async ({ page }) => {
		await page.goto("/confidentialite");
		await page.waitForLoadState("domcontentloaded");

		const body = await page.textContent("body");
		// RGPD rights should be mentioned
		expect(body).toMatch(
			/droit d'accès|droit de rectification|droit à l'effacement|droit d'opposition/i,
		);
	});

	test("/retractation affiche le bouton d'impression", async ({ page }) => {
		await page.goto("/retractation");
		await page.waitForLoadState("domcontentloaded");

		const printButton = page.getByRole("button", { name: /Imprimer|imprimer/i });
		await expect(printButton).toBeVisible();
	});

	test("/cookies affiche les préférences de cookies", async ({ page }) => {
		await page.goto("/cookies");
		await page.waitForLoadState("domcontentloaded");

		// Cookie preferences component should be present
		const cookieSection = page.getByText(/préférences|gérer|paramétrer/i);
		await expect(cookieSection.first()).toBeVisible();
	});
});

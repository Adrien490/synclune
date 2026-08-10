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

	/*
	 * ⚠️ Le test « /aide redirige vers la FAQ de la landing, ancre comprise » a été
	 * retiré le 2026-08-08 : la section FAQ a été supprimée (à refaire), et avec
	 * elle l'ancre `/#faq`, la règle 308 et l'entrée `/aide` des `publicRoutes`.
	 *
	 * Deux choses à ne pas re-perdre quand elle revient :
	 *
	 * - il faut LES DEUX moitiés — sans `/aide` dans `publicRoutes`, le
	 *   default-deny du proxy renvoie vers `/` NU : la page s'ouvre, simplement
	 *   pas sur la FAQ. C'est le défaut d'origine (audit « Pages légales »
	 *   2026-08-01) sous une forme plus discrète ;
	 * - on assert avec `page.url()` et JAMAIS `response.url()` : un fragment n'est
	 *   pas envoyé au serveur, donc l'URL de la RÉPONSE le perd. Seule la barre
	 *   d'adresse sait si l'ancre a survécu à la redirection.
	 *
	 * La complétude du démontage est verrouillée côté unitaire en attendant
	 * (`legal-urls-coherence.regression.test.ts`).
	 */

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

	/**
	 * Art. L612-1 du Code de la consommation : les coordonnées du médiateur doivent
	 * figurer dans les CGV **et** dans les mentions légales, pas dans les seules CGV.
	 *
	 * Le défaut attrapé ici est exactement celui qui existait avant le 2026-08-06 :
	 * le bloc ne vivait que dans `/cgv`. On assert le nom de l'organisme ET le visa
	 * légal — un encadré de coordonnées sans l'article ne dit pas au consommateur de
	 * quel droit il dispose, et c'est la partie qui se perd en premier au copier-coller.
	 */
	for (const path of ["/cgv", "/mentions-legales"]) {
		test(`${path} porte les coordonnées du médiateur (art. L612-1)`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			const body = page.locator("body");
			await expect(body).toContainText("CNPM");
			await expect(body).toContainText("cnpm-mediation-consommation.eu");
			await expect(body).toContainText(/article L612-1 du Code de la consommation/i);
		});
	}

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

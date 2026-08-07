import { test, expect } from "./fixtures";

test.describe("SEO et métadonnées - Homepage", { tag: ["@slow"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
	});

	/**
	 * ⚠️ Assertion RETARGETÉE le 2026-08-06 : elle exigeait `/Bijoux artisanaux/`,
	 * une chaîne que la marque a explicitement abandonnée et que le `<title>` servi
	 * ne contient plus (« Synclune | Bijoux colorés faits main à Nantes »). Le test
	 * verrouillait donc ACTIVEMENT la copie périmée — et comme il est taggé `@slow`,
	 * son échec pouvait passer inaperçu.
	 *
	 * On assert désormais le territoire distinctif de `docs/BRAND-DA.md` (couleur +
	 * fait main + lieu) plutôt qu'une chaîne exacte : c'est ce que le titre doit
	 * porter, et ça survit à une reformulation.
	 */
	test("la homepage a le titre correct", async ({ page }) => {
		await expect(page).toHaveTitle(/Synclune/);
		await expect(page).toHaveTitle(/colorés/i);
		await expect(page).toHaveTitle(/faits main/i);
		await expect(page).toHaveTitle(/Nantes/);
		// Le pléonasme sans couleur ni lieu, explicitement écarté.
		await expect(page).not.toHaveTitle(/Bijoux artisanaux/i);
	});

	test("la homepage a une meta description", async ({ page }) => {
		const metaDescription = page.locator('meta[name="description"]');
		await expect(metaDescription).toHaveAttribute("content", /bijoux/i);
	});

	test("la homepage a un lien canonical", async ({ page }) => {
		const canonical = page.locator('link[rel="canonical"]');
		await expect(canonical).toBeAttached();

		const href = await canonical.getAttribute("href");
		expect(href).toBeTruthy();
	});

	test("la page a l'attribut lang='fr' sur le html", async ({ page }) => {
		const htmlElement = page.locator("html");
		await expect(htmlElement).toHaveAttribute("lang", "fr");
	});

	test("la homepage contient des données structurées JSON-LD", async ({ page }) => {
		// Wait for JSON-LD scripts to be injected
		await page.locator('script[type="application/ld+json"]').first().waitFor();

		const jsonLdScripts = page.locator('script[type="application/ld+json"]');
		const count = await jsonLdScripts.count();
		expect(count).toBeGreaterThan(0);

		// Vérifier que le JSON-LD est valide
		const firstScript = jsonLdScripts.first();
		const content = await firstScript.textContent();
		expect(content).toBeTruthy();

		// Parser le JSON pour vérifier la validité
		let parsed: unknown;
		expect(() => {
			parsed = JSON.parse(content!);
		}).not.toThrow();

		// La structure doit avoir un @type
		expect(parsed).toHaveProperty("@context");
	});

	test("la homepage a des balises Open Graph", async ({ page }) => {
		const ogTitle = page.locator('meta[property="og:title"]');
		await expect(ogTitle).toBeAttached();
		await expect(ogTitle).toHaveAttribute("content", /Synclune/i);

		const ogDescription = page.locator('meta[property="og:description"]');
		await expect(ogDescription).toBeAttached();

		const ogType = page.locator('meta[property="og:type"]');
		await expect(ogType).toBeAttached();
		await expect(ogType).toHaveAttribute("content", "website");
	});

	test("la homepage a des balises Twitter Card", async ({ page }) => {
		const twitterCard = page.locator('meta[name="twitter:card"]');
		await expect(twitterCard).toBeAttached();

		const twitterTitle = page.locator('meta[name="twitter:title"]');
		await expect(twitterTitle).toBeAttached();
	});

	// La FAQ est REVENUE sur la home le 2026-08-05 (absorption de `/aide`) —
	// elle avait été retirée à la refonte landing du 2026-08-03.
	test("la homepage porte la section FAQ et son JSON-LD FAQPage", async ({ page }) => {
		await expect(page.locator("#faq")).toBeVisible();

		// Le FAQPage est un NŒUD du `@graph` de `StructuredData`, pas un second
		// script : c'est ce montage qui garantit une seule BreadcrumbList sur `/`.
		// ⚠️ Le HTML streamé contient l'écho du repli `Suspense` en plus du rendu
		// résolu — on cherche donc le nœud dans N'IMPORTE lequel des scripts,
		// sans compter combien il y en a.
		const graphs = await page.locator('script[type="application/ld+json"]').allTextContents();
		const faqPage = graphs
			.map((raw) => JSON.parse(raw))
			.flatMap((json) => json["@graph"] ?? [json])
			.find((node) => node["@type"] === "FAQPage");

		expect(faqPage, "aucun nœud FAQPage dans le JSON-LD de l'accueil").toBeDefined();
		expect(faqPage.mainEntity.length).toBeGreaterThan(0);
		expect(faqPage.mainEntity[0]["@type"]).toBe("Question");
		expect(faqPage.mainEntity[0].acceptedAnswer.text.length).toBeGreaterThan(10);
	});

	// Les deux sections du 2026-08-05 n'avaient AUCUNE assertion E2E (constat
	// de l'audit landing du 2026-08-06) : la FAQ était la seule verrouillée.
	test("la homepage porte les sections Collections et Atelier, et le nœud HowTo ancre ses étapes", async ({
		page,
	}) => {
		// Les ancres sont un CONTRAT une fois partagées (`/#collections`,
		// `/#atelier` — cette dernière est aussi l'@id du nœud HowTo).
		await expect(page.locator("#collections")).toBeVisible();
		await expect(page.locator("#atelier")).toBeVisible();

		// Même montage que le FAQPage : un NŒUD du `@graph`, jamais un second
		// script — et même parcours tolérant à l'écho du repli `Suspense`.
		const graphs = await page.locator('script[type="application/ld+json"]').allTextContents();
		const howTo = graphs
			.map((raw) => JSON.parse(raw))
			.flatMap((json) => json["@graph"] ?? [json])
			.find((node) => node["@type"] === "HowTo");

		expect(howTo, "aucun nœud HowTo dans le JSON-LD de l'accueil").toBeDefined();
		expect(howTo.step.length).toBeGreaterThan(0);

		// Chaque `url` de HowToStep pointe un fragment qui doit exister dans le
		// DOM — un schéma qui référence une ancre morte est pire qu'absent.
		for (const step of howTo.step) {
			const fragment = String(step.url).split("#")[1];
			expect(fragment, `HowToStep sans fragment : ${step.url}`).toBeTruthy();
			await expect(page.locator(`#${fragment}`)).toBeAttached();
		}
	});
});

test.describe("SEO et métadonnées - Page produits", { tag: ["@slow"] }, () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");
	});

	test("la page /produits a un titre contenant Synclune", async ({ page }) => {
		await expect(page).toHaveTitle(/Synclune/);
	});

	test("la page /produits a une meta description", async ({ page }) => {
		const metaDescription = page.locator('meta[name="description"]');
		await expect(metaDescription).toBeAttached();
		const content = await metaDescription.getAttribute("content");
		expect(content).toBeTruthy();
		expect(content!.length).toBeGreaterThan(10);
	});

	test("la page /produits a un lien canonical", async ({ page }) => {
		const canonical = page.locator('link[rel="canonical"]');
		await expect(canonical).toBeAttached();

		const href = await canonical.getAttribute("href");
		expect(href).toBeTruthy();
	});

	test("la page /produits contient des données structurées JSON-LD", async ({ page }) => {
		await page.locator('script[type="application/ld+json"]').first().waitFor();

		const jsonLdScripts = page.locator('script[type="application/ld+json"]');
		const count = await jsonLdScripts.count();
		expect(count).toBeGreaterThan(0);

		// Valider que le JSON est bien formé
		const firstContent = await jsonLdScripts.first().textContent();
		expect(() => JSON.parse(firstContent!)).not.toThrow();
	});
});

test.describe("SEO et métadonnées - Page produit détail", { tag: ["@slow"] }, () => {
	test("la page détail produit a un JSON-LD de type Product", async ({
		page,
		productCatalogPage,
	}) => {
		await productCatalogPage.goto();

		expect(
			await productCatalogPage.productLinks.count(),
			"No products found in database - seed data required",
		).toBeGreaterThan(0);

		await productCatalogPage.gotoFirstProduct();
		await page.locator('script[type="application/ld+json"]').first().waitFor();

		// Chercher un JSON-LD de type Product
		const jsonLdScripts = page.locator('script[type="application/ld+json"]');
		const count = await jsonLdScripts.count();
		expect(count).toBeGreaterThan(0);

		// Au moins un script doit contenir "@type":"Product"
		let hasProductSchema = false;
		for (let i = 0; i < count; i++) {
			const content = await jsonLdScripts.nth(i).textContent();
			if (content && content.includes("Product")) {
				hasProductSchema = true;
				break;
			}
		}
		expect(hasProductSchema).toBe(true);
	});

	test("la page détail produit a un titre SEO pertinent", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto();

		expect(
			await productCatalogPage.productLinks.count(),
			"No products found in database - seed data required",
		).toBeGreaterThan(0);

		await productCatalogPage.gotoFirstProduct();

		await expect(page).toHaveTitle(/Synclune/);
	});

	test("la page détail produit a des balises Open Graph", async ({ page, productCatalogPage }) => {
		await productCatalogPage.goto();

		expect(
			await productCatalogPage.productLinks.count(),
			"No products found in database - seed data required",
		).toBeGreaterThan(0);

		await productCatalogPage.gotoFirstProduct();

		const ogTitle = page.locator('meta[property="og:title"]');
		await expect(ogTitle).toBeAttached();
	});
});

test.describe("SEO - OG images dynamiques", { tag: ["@slow"] }, () => {
	test("la page categorie produit a une OG image dynamique", async ({ page }) => {
		const response = await page.goto("/produits/colliers/opengraph-image");

		expect(response?.status()).toBe(200);
		expect(response?.headers()["content-type"]).toMatch(/^image\//);
	});
});

test.describe("SEO - Pages légales", { tag: ["@slow"] }, () => {
	test("la page CGV charge correctement", async ({ page }) => {
		await page.goto("/cgv");
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/cgv/);
		await expect(page).toHaveTitle(/Synclune/);
	});

	test("la page mentions légales charge correctement", async ({ page }) => {
		await page.goto("/mentions-legales");
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/mentions-legales/);
	});

	test("la page confidentialité charge correctement", async ({ page }) => {
		await page.goto("/confidentialite");
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/confidentialite/);
	});

	test("la page 404 s'affiche pour une route inexistante", async ({ page }) => {
		const response = await page.goto("/route-qui-nexiste-vraiment-pas-du-tout");
		expect(response?.status()).toBe(404);
	});
});

test.describe("SEO - Attributs HTML globaux", { tag: ["@slow"] }, () => {
	const pagesToCheck = ["/", "/produits", "/collections", "/connexion"];

	for (const path of pagesToCheck) {
		test(`la page ${path} a lang="fr" sur l'élément html`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			const htmlLang = await page.locator("html").getAttribute("lang");
			expect(htmlLang).toBe("fr");
		});
	}
});

test.describe("SEO - robots.txt et sitemap.xml", { tag: ["@slow"] }, () => {
	test("robots.txt est accessible et retourne 200", async ({ page }) => {
		const response = await page.goto("/robots.txt");

		expect(response?.status()).toBe(200);

		const body = await response?.text();
		expect(body).toBeTruthy();
		expect(body).toContain("User-agent");
	});

	test("sitemap.xml est accessible et contient du XML valide", async ({ page }) => {
		const response = await page.goto("/sitemap.xml");

		expect(response?.status()).toBe(200);

		const body = await response?.text();
		expect(body).toBeTruthy();
		expect(body).toContain("<?xml");
		expect(body).toContain("<urlset");
	});

	test("sitemap.xml contient les pages principales", async ({ page }) => {
		const response = await page.goto("/sitemap.xml");
		const body = await response?.text();

		expect(body).toContain("/produits");
		expect(body).toContain("/collections");
	});

	test("sitemap-images.xml est accessible et contient les produits", async ({ page }) => {
		const response = await page.goto("/sitemap-images.xml");

		expect(response?.status()).toBe(200);

		const body = await response?.text();
		expect(body).toBeTruthy();
		expect(body).toContain("<urlset");
		expect(body).toContain("/creations/");

		// L'extension Google Image est le SEUL intérêt de ce sitemap : sans ces
		// assertions, elle pouvait disparaître entièrement sans faire échouer le test.
		expect(body).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
		expect(body).toContain("<image:loc>");
		expect(body).toContain("<image:caption>");
		expect(body).toContain("<image:title>");
		expect(body).toContain("<lastmod>");

		// Aucun `&` nu : un seul suffit à faire rejeter le sitemap par Google.
		expect(body).not.toMatch(/&(?!amp;|quot;|apos;|lt;|gt;|#)/);
	});
});

test.describe("SEO - noindex sur pages privees", { tag: ["@slow"] }, () => {
	test("la page /verifier-email a noindex", async ({ page }) => {
		await page.goto("/verifier-email");
		await page.waitForLoadState("domcontentloaded");

		const robotsMeta = page.locator('meta[name="robots"]');
		await expect(robotsMeta).toBeAttached();

		const content = await robotsMeta.getAttribute("content");
		expect(content).toMatch(/noindex/);
	});

	test("la page /renvoyer-verification a noindex", async ({ page }) => {
		await page.goto("/renvoyer-verification");
		await page.waitForLoadState("domcontentloaded");

		const robotsMeta = page.locator('meta[name="robots"]');
		await expect(robotsMeta).toBeAttached();

		const content = await robotsMeta.getAttribute("content");
		expect(content).toMatch(/noindex/);
	});
});

import { test, expect } from "./fixtures";

test.describe("Parcours utilisateur authentifie", { tag: ["@regression"] }, () => {
	/**
	 * Ce bloc vérifiait que `/commandes`, `/parametres` et `/favoris` redirigeaient un
	 * visiteur vers `/connexion`. Deux de ces trois routes ont disparu au retrait de
	 * l'espace client (2026-07-31) — et `/favoris` n'a JAMAIS dû rediriger : la
	 * wishlist est portée par un cookie (aujourd'hui `wishlist`, qui contient
	 * directement les Product IDs — retrait de la base 2026-08-03), elle est accessible aux
	 * invités (le test passait parce que la route figurait déjà dans `publicRoutes`,
	 * donc l'assertion de redirection n'y était jamais évaluée… sur une liste où elle
	 * n'aurait pas dû figurer).
	 *
	 * Le nouveau contrat : les routes client supprimées tombent dans le default-deny
	 * du proxy (→ `/`), et `/favoris` reste servi tel quel.
	 */
	const removedAccountRoutes = ["/commandes", "/parametres", "/connexion"];

	for (const route of removedAccountRoutes) {
		test(`${route} n'existe plus et retombe sur l'accueil (default-deny)`, async ({ page }) => {
			await page.goto(route);
			await page.waitForLoadState("domcontentloaded");

			expect(new URL(page.url()).pathname, `${route} doit retomber sur /`).toBe("/");
		});
	}

	test("/favoris reste accessible sans compte", async ({ page }) => {
		await page.goto("/favoris");
		await page.waitForLoadState("domcontentloaded");

		expect(new URL(page.url()).pathname).toBe("/favoris");
	});
});

test.describe("Navigation entre pages critiques", () => {
	test("la navigation boutique fonctionne de bout en bout", async ({ page }) => {
		// Start at homepage
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
		await expect(page).toHaveTitle(/Synclune/);

		// Navigate to products via navigation link
		const productLink = page.getByRole("link", { name: /Créations|Produits|Boutique/i });
		await expect(productLink.first()).toBeVisible();
		await productLink.first().click();
		await page.waitForLoadState("domcontentloaded");
		await expect(page).toHaveURL(/\/produits/);

		// Navigate to collections. Firefox/WebKit : un `goto()` lancé pendant
		// qu'une navigation cliente du router est encore en vol est avorté
		// (NS_BINDING_ABORTED) — on retente une fois.
		await page.goto("/collections").catch(() => page.goto("/collections"));
		await page.waitForLoadState("domcontentloaded");
		await expect(page).toHaveURL(/\/collections/);

		const collectionsHeading = page.getByRole("heading", { level: 1 });
		await expect(collectionsHeading).toBeVisible();
	});

	test("les pages legales sont accessibles depuis le footer", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const footer = page.locator("footer");
		await expect(footer).toBeAttached();

		// Check legal links exist in footer
		const legalLinks = [
			{ name: /CGV|conditions/i, href: /cgv/ },
			{ name: /mentions/i, href: /mentions/ },
			{ name: /confidentialité/i, href: /confidentialite/ },
		];

		for (const { name, href } of legalLinks) {
			const link = footer.getByRole("link", { name });
			await expect(link.first()).toBeAttached();
			const linkHref = await link.first().getAttribute("href");
			expect(linkHref).toMatch(href);
		}
	});
});

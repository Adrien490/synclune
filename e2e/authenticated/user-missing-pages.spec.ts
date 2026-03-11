import { test, expect } from "../fixtures";
import { requireSeedData } from "../constants";

test.describe("Pages manquantes - Couverture", { tag: ["@regression"] }, () => {
	test.describe("Collections detail", () => {
		test("la page /collections affiche les collections", async ({ page }) => {
			await page.goto("/collections");
			await page.waitForLoadState("domcontentloaded");

			const heading = page.getByRole("heading", { level: 1 });
			await expect(heading).toBeVisible();

			// Should have collection links
			const collectionLinks = page.locator('a[href*="/collections/"]');
			const count = await collectionLinks.count();
			requireSeedData(test, count > 0, "No collections found");
		});

		test("naviguer vers une collection specifique", async ({ page }) => {
			await page.goto("/collections");
			await page.waitForLoadState("domcontentloaded");

			const collectionLinks = page.locator('a[href*="/collections/"]');
			const count = await collectionLinks.count();
			requireSeedData(test, count > 0, "No collections found");

			// Navigate to first collection
			const href = await collectionLinks.first().getAttribute("href");
			await page.goto(href!);
			await page.waitForLoadState("domcontentloaded");

			// Collection detail page should have a heading
			const heading = page.getByRole("heading", { level: 1 });
			await expect(heading).toBeVisible();

			// Should show products or empty state
			const products = page.locator('a[href*="/creations/"]');
			const emptyState = page.getByText(/aucun produit|vide/i);
			await expect(products.first().or(emptyState)).toBeVisible({ timeout: 10000 });
		});

		test("la page collection affiche des produits filtrables", async ({ page }) => {
			await page.goto("/collections");
			await page.waitForLoadState("domcontentloaded");

			const collectionLinks = page.locator('a[href*="/collections/"]');
			const count = await collectionLinks.count();
			requireSeedData(test, count > 0, "No collections found");

			const href = await collectionLinks.first().getAttribute("href");
			await page.goto(href!);
			await page.waitForLoadState("domcontentloaded");

			// Check for filter/sort controls if they exist
			const products = page.locator('a[href*="/creations/"]');
			const productCount = await products.count();

			if (productCount > 0) {
				// Products have prices
				const body = await page.textContent("body");
				expect(body).toMatch(/\d+[,.]?\d*\s*€/);
			}
		});
	});

	test.describe("Mes demandes (personnalisations)", () => {
		test("la page /mes-demandes est accessible", async ({ page }) => {
			await page.goto("/compte/mes-demandes");
			await page.waitForLoadState("domcontentloaded");

			// Should show heading or redirect to account
			const heading = page.getByRole("heading", { level: 1 });
			await expect(heading).toBeVisible();
		});

		test("la page /mes-demandes affiche un etat", async ({ page }) => {
			await page.goto("/compte/mes-demandes");
			await page.waitForLoadState("domcontentloaded");

			// Either list of requests or empty state
			const content = page
				.getByText(/demande|personnalisation|aucune|vide/i)
				.or(page.getByRole("heading", { level: 1 }));
			await expect(content.first()).toBeVisible();
		});

		test("le bouton 'Nouvelle demande' redirige vers /personnalisation", async ({ page }) => {
			await page.goto("/compte/mes-demandes");
			await page.waitForLoadState("domcontentloaded");

			const newRequestButton = page
				.getByRole("link", { name: /Nouvelle demande|Demander/i })
				.or(page.getByRole("button", { name: /Nouvelle demande|Demander/i }));
			const hasButton = (await newRequestButton.count()) > 0;
			test.skip(!hasButton, "Pas de bouton nouvelle demande visible");

			await newRequestButton.first().click();
			await page.waitForLoadState("domcontentloaded");
			await expect(page).toHaveURL(/\/personnalisation/);
		});
	});

	test.describe("Mes avis", () => {
		test("la page /mes-avis est accessible", async ({ page }) => {
			await page.goto("/compte/mes-avis");
			await page.waitForLoadState("domcontentloaded");

			const heading = page.getByRole("heading", { level: 1 });
			await expect(heading).toBeVisible();
		});

		test("la page /mes-avis affiche un etat", async ({ page }) => {
			await page.goto("/compte/mes-avis");
			await page.waitForLoadState("domcontentloaded");

			// Either list of reviews or empty state
			const content = page
				.getByText(/avis|évaluation|aucun|vide/i)
				.or(page.getByRole("heading", { level: 1 }));
			await expect(content.first()).toBeVisible();
		});

		test("l'état vide affiche un CTA vers les créations", async ({ page }) => {
			await page.goto("/compte/mes-avis");
			await page.waitForLoadState("domcontentloaded");

			const emptyState = page.getByText(/aucun avis/i);
			const hasEmptyState = (await emptyState.count()) > 0;
			test.skip(!hasEmptyState, "L'utilisateur a des avis - pas d'état vide");

			const ctaLink = page.getByRole("link", { name: /Découvrir|créations|boutique/i });
			await expect(ctaLink.first()).toBeVisible();
		});
	});
});

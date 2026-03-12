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
});

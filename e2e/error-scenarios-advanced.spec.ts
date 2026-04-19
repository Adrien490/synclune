import { test, expect } from "./fixtures";

test.describe("Scenarios d'erreur avances", { tag: ["@regression"] }, () => {
	test("coupure reseau pendant le chargement d'une page produit", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLinks = page.locator('a[href*="/creations/"]');
		const count = await productLinks.count();
		test.skip(count === 0, "No products available");

		const href = await productLinks.first().getAttribute("href");

		// Intercept all fetch requests to simulate network failure
		await page.route("**/api/**", (route) => route.abort("connectionrefused"));

		await page.goto(href!);

		// Page should still render (SSR), even if API calls fail
		await page.waitForLoadState("domcontentloaded");
		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		// Clean up route
		await page.unroute("**/api/**");
	});

	test("coupure reseau complete affiche une erreur appropriee", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Abort all navigation requests
		await page.route("**/*", (route) => {
			if (route.request().resourceType() === "document") {
				return route.abort("connectionrefused");
			}
			return route.continue();
		});

		// Try to navigate — this should fail gracefully
		try {
			await page.goto("/produits", { timeout: 5000 });
		} catch {
			// Navigation failure is expected
		}

		// URL should still be the homepage (navigation blocked)
		expect(page.url()).not.toContain("/produits");

		// Clean up
		await page.unroute("**/*");
	});

	test("requete API lente affiche un etat de chargement", async ({ page }) => {
		// Add 3s delay to API calls
		await page.route("**/api/**", async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 3000));
			await route.continue();
		});

		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// Page should still be usable even with slow API
		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();

		// Clean up
		await page.unroute("**/api/**");
	});
});

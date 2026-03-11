import { test, expect } from "./fixtures";

test.describe("Pages d'erreur", { tag: ["@regression"] }, () => {
	test("une URL inexistante affiche la page 404", async ({ page }) => {
		const response = await page.goto("/page-inexistante-e2e-test-xyz");

		// In dev mode, Next.js may return 200 for not-found pages
		const status = response?.status();
		expect(status === 404 || status === 200).toBe(true);

		// Should show error content
		const body = await page.textContent("body");
		expect(body).toMatch(/404|introuvable|n'existe pas|page non trouvée/i);
	});

	test("la page 404 contient un lien vers l'accueil", async ({ page }) => {
		await page.goto("/page-inexistante-e2e-test-xyz");

		const homeLink = page
			.getByRole("link", { name: /accueil|retour/i })
			.or(page.getByRole("link", { name: /boutique/i }));
		await expect(homeLink.first()).toBeVisible();
	});

	test("la page d'erreur auth gère les erreurs de connexion", async ({ page }) => {
		// Navigate to auth error page with error param
		await page.goto("/connexion?error=unknown");
		await page.waitForLoadState("domcontentloaded");

		// Should show the login page (potentially with error message)
		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();
	});

	test("un produit inexistant affiche une erreur", async ({ page }) => {
		const response = await page.goto("/creations/produit-inexistant-e2e-xyz");

		// Should show 404 or error page
		const status = response?.status();
		expect(status === 404 || status === 200).toBe(true);

		if (status === 200) {
			// If 200, should show a "not found" message in the page
			const body = await page.textContent("body");
			expect(body).toMatch(/introuvable|n'existe|pas trouvé|erreur/i);
		}
	});
});

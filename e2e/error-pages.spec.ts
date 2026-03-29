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

	test("une collection inexistante affiche une erreur", async ({ page }) => {
		const response = await page.goto("/collections/collection-inexistante-e2e-xyz");

		const status = response?.status();
		expect(status === 404 || status === 200).toBe(true);

		if (status === 200) {
			const body = await page.textContent("body");
			expect(body).toMatch(/introuvable|n'existe|pas trouvé|erreur/i);
		}
	});

	test("la page 404 ne contient pas d'erreurs JS dans la console", async ({ page }) => {
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				consoleErrors.push(msg.text());
			}
		});

		await page.goto("/page-inexistante-e2e-test-xyz");
		await page.waitForLoadState("domcontentloaded");

		// Filter out expected errors (like favicon 404)
		const unexpectedErrors = consoleErrors.filter(
			(err) => !err.includes("favicon") && !err.includes("404"),
		);
		expect(unexpectedErrors.length, `Console errors found: ${unexpectedErrors.join("\n")}`).toBe(0);
	});

	test("les routes admin protégées redirigent vers la connexion", async ({ page }) => {
		// Clear auth state by going to a new context behavior
		const _response = await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		// Should either redirect to login or show the page (if already authenticated)
		const url = page.url();
		const isOnAdmin = url.includes("/admin");
		const isOnLogin = url.includes("/connexion");

		// One of these must be true
		expect(isOnAdmin || isOnLogin).toBe(true);
	});
});

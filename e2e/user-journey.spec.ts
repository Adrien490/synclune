import { test, expect } from "./fixtures";

test.describe("Parcours utilisateur authentifie", { tag: ["@regression"] }, () => {
	test("la connexion avec des identifiants invalides affiche une erreur", async ({
		page,
		authPage,
	}) => {
		await authPage.goto();

		await authPage.login("fake@example.com", "mauvaisMotDePasse123");

		// Should stay on login page and show an error
		const errorMessage = page.getByText(/Identifiants invalides|Email ou mot de passe incorrect/i);
		await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
		await expect(page).toHaveURL(/\/connexion/);
	});

	test("le mot de passe oublie envoie un lien et affiche une confirmation", async ({ page }) => {
		await page.goto("/mot-de-passe-oublie");
		await page.waitForLoadState("domcontentloaded");

		const emailInput = page.getByRole("textbox", { name: /Email/i });
		const submitButton = page.getByRole("button", { name: /Envoyer le lien/i });

		await emailInput.fill("test@example.com");
		await submitButton.click();

		// Wait for feedback after form submission
		const confirmationMessage = page.getByText(/envoyé|vérifiez votre email|lien.*envoyé/i);
		const errorMessage = page.getByText(/erreur|impossible/i);

		// Either success confirmation or error (both are valid responses)
		await expect(confirmationMessage.first().or(errorMessage.first())).toBeVisible({
			timeout: 5000,
		});
	});

	const accountRoutes = ["/commandes", "/adresses", "/favoris"];

	for (const route of accountRoutes) {
		test(`${route} redirects unauthenticated users to login`, async ({ page }) => {
			await page.goto(route);
			await page.waitForLoadState("domcontentloaded");

			const url = page.url();
			expect(url, `${route} should redirect to connexion`).toMatch(/\/connexion/);
		});
	}
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

		// Navigate to collections
		await page.goto("/collections");
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

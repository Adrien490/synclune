import { test, expect } from "./fixtures";
import { TIMEOUTS } from "./constants";

test.describe("Securite admin - Protection inter-roles", { tag: ["@critical"] }, () => {
	const adminRoutes = [
		"/admin",
		"/admin/catalogue/produits",
		"/admin/catalogue/collections",
		"/admin/ventes/commandes",
		"/admin/ventes/remboursements",
		"/admin/marketing/discounts",
		"/admin/marketing/avis",
		"/admin/marketing/newsletter",
		"/admin/marketing/personnalisations",
	];

	for (const route of adminRoutes) {
		test(`utilisateur non authentifie → ${route} redirige vers /connexion`, async ({ browser }) => {
			// Create a fresh context without any auth state
			const context = await browser.newContext();
			const page = await context.newPage();

			await page.goto(`http://localhost:3000${route}`);
			await page.waitForLoadState("domcontentloaded");

			// Should redirect to login
			await expect(page).toHaveURL(/\/connexion/, { timeout: TIMEOUTS.AUTH_REDIRECT });

			// Should include callbackURL for post-login redirect
			const url = page.url();
			expect(url).toContain("callbackURL");

			await context.close();
		});
	}

	test("utilisateur non-admin → /admin retourne une erreur", async ({ browser }) => {
		// Use the regular user auth state (not admin)
		const context = await browser.newContext({
			storageState: "e2e/.auth/user.json",
		});
		const page = await context.newPage();

		await page.goto("http://localhost:3000/admin");
		await page.waitForLoadState("domcontentloaded");

		// Should either:
		// 1. Redirect to homepage/account (403-like behavior)
		// 2. Show access denied message
		// 3. Show 403 status
		const url = page.url();
		const isOnAdmin = url.includes("/admin") && !url.includes("/connexion");

		if (isOnAdmin) {
			// If still on /admin, there should be an error message
			const errorContent = page.getByText(/accès refusé|non autorisé|forbidden|interdit/i);
			await expect(errorContent.first()).toBeVisible({ timeout: 5000 });
		} else {
			// Redirected away from admin — acceptable security behavior
			expect(url).not.toContain("/admin");
		}

		await context.close();
	});

	test("la page de connexion affiche le formulaire apres la redirection depuis /admin", async ({
		page,
		authPage,
	}) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/connexion/);
		await expect(page).toHaveTitle(/Connexion.*Synclune|Synclune.*Connexion/i);

		await expect(authPage.emailInput).toBeVisible();
	});

	test("utilisateur non-admin → /admin/catalogue/produits bloque l'acces", async ({ browser }) => {
		const context = await browser.newContext({
			storageState: "e2e/.auth/user.json",
		});
		const page = await context.newPage();

		await page.goto("http://localhost:3000/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const url = page.url();
		const isOnAdminProducts = url.includes("/admin/catalogue/produits");

		if (isOnAdminProducts) {
			const errorContent = page.getByText(/accès refusé|non autorisé|forbidden|interdit/i);
			await expect(errorContent.first()).toBeVisible({ timeout: 5000 });
		} else {
			// Redirected — verify not on admin
			expect(url).not.toContain("/admin/catalogue/produits");
		}

		await context.close();
	});
});

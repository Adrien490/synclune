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
	];

	for (const route of adminRoutes) {
		test(`utilisateur non authentifie → ${route} redirige vers /connexion (proxy)`, async ({
			browser,
		}) => {
			const context = await browser.newContext();
			const page = await context.newPage();

			await page.goto(`http://localhost:3000${route}`);
			await page.waitForLoadState("domcontentloaded");

			await expect(page).toHaveURL(/\/connexion/, { timeout: TIMEOUTS.AUTH_REDIRECT });

			const url = page.url();
			expect(url).toContain("callbackURL");

			await context.close();
		});
	}

	test("utilisateur non-admin → /admin redirige hors admin (proxy)", async ({ browser }) => {
		const context = await browser.newContext({
			storageState: "e2e/.auth/user.json",
		});
		const page = await context.newPage();

		await page.goto("http://localhost:3000/admin");
		await page.waitForLoadState("domcontentloaded");

		const url = page.url();
		expect(url).not.toContain("/admin");

		await context.close();
	});

	test("page de connexion affichee apres redirection depuis /admin", async ({ page, authPage }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/connexion/);
		await expect(page).toHaveTitle(/Connexion.*Synclune|Synclune.*Connexion/i);
		await expect(authPage.emailInput).toBeVisible();
	});

	test("utilisateur non-admin → /admin/catalogue/produits redirige hors admin", async ({
		browser,
	}) => {
		const context = await browser.newContext({
			storageState: "e2e/.auth/user.json",
		});
		const page = await context.newPage();

		await page.goto("http://localhost:3000/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		const url = page.url();
		expect(url).not.toContain("/admin/catalogue/produits");

		await context.close();
	});
});

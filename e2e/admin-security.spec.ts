import { test, expect } from "./fixtures";
import { TIMEOUTS } from "./constants";

test.describe("Securite admin - Protection inter-roles", { tag: ["@critical"] }, () => {
	const adminRoutes = [
		"/admin",
		"/admin/catalogue/produits",
		"/admin/catalogue/collections",
		"/admin/ventes/commandes",
		"/admin/ventes/retractations",
	];

	for (const route of adminRoutes) {
		test(`utilisateur non authentifie → ${route} redirige vers /admin/connexion (proxy)`, async ({
			browser,
		}) => {
			const context = await browser.newContext();
			const page = await context.newPage();

			await page.goto(`http://localhost:3000${route}`);
			await page.waitForLoadState("domcontentloaded");

			await expect(page).toHaveURL(/\/admin\/connexion/, { timeout: TIMEOUTS.AUTH_REDIRECT });

			const url = page.url();
			expect(url).toContain("callbackURL");

			await context.close();
		});
	}

	test("page de connexion affichee apres redirection depuis /admin", async ({ page }) => {
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		await expect(page).toHaveURL(/\/admin\/connexion/);
		await expect(page.getByRole("heading", { level: 1, name: /Connexion/i })).toBeVisible();
	});
});

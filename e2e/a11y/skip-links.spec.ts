import { test, expect } from "../fixtures";

test.describe("Accessibilité - Skip link", { tag: ["@slow"] }, () => {
	const layouts = [
		{ path: "/", name: "Boutique (homepage)" },
		{ path: "/produits", name: "Boutique (produits)" },
		{ path: "/connexion", name: "Auth (connexion)" },
		{ path: "/inscription", name: "Auth (inscription)" },
		{ path: "/paiement/annulation", name: "Checkout (annulation)" },
	];

	for (const { path, name } of layouts) {
		test(`${name} - Tab affiche le skip link et Enter déplace le focus vers #main-content`, async ({
			page,
		}) => {
			await page.goto(path);
			await page.waitForLoadState("domcontentloaded");

			// First Tab should focus the skip link
			await page.keyboard.press("Tab");
			const skipLink = page.locator('a[href="#main-content"]');
			await expect(skipLink).toBeFocused();
			await expect(skipLink).toBeVisible();

			// Enter should move focus to main-content
			await page.keyboard.press("Enter");

			const mainContent = page.locator("#main-content");
			await expect(mainContent).toBeAttached();

			// Verify focus moved to the main-content area
			const focusIsOnOrInMain = await page.evaluate(() => {
				const main = document.getElementById("main-content");
				const active = document.activeElement;
				return main === active || main?.contains(active ?? null);
			});
			expect(focusIsOnOrInMain).toBe(true);
		});
	}

	test("le skip link a le texte correct", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const skipLink = page.locator('a[href="#main-content"]');
		await expect(skipLink).toHaveText("Aller au contenu principal");
	});
});

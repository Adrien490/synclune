import { test, expect } from "../fixtures";

test.describe("Accessibilité - Skip link", { tag: ["@slow"] }, () => {
	// Pas d'entrée `/admin/connexion` : la page rend son propre `<main>` sans
	// `id="main-content"` (app/admin/connexion/page.tsx), la cible du skip link
	// n'y existe pas.
	const layouts = [
		{ path: "/", name: "Boutique (homepage)" },
		{ path: "/produits", name: "Boutique (produits)" },
		{ path: "/paiement/annulation", name: "Checkout (annulation)" },
	];

	for (const { path, name } of layouts) {
		test(`${name} - Tab affiche le skip link et Enter déplace le focus vers #main-content`, async ({
			page,
			browserName,
		}) => {
			// Politique Safari : Tab ne visite que les champs de saisie, jamais les
			// LIENS (WebKit Playwright la reproduit). Le skip link reste accessible
			// aux vrais utilisateurs Safari (VoiceOver, Full Keyboard Access) — ce
			// mode d'interaction n'est simplement pas pilotable par ce test.
			test.skip(browserName === "webkit", "Tab ne visite pas les liens sous WebKit");
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

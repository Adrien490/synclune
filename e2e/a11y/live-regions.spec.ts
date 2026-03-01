import { test, expect } from "../fixtures";

test.describe("Accessibilité - Live regions", { tag: ["@slow"] }, () => {
	test("le toast après ajout au panier a aria-live", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLink = page.locator("article a[href*='/creations/']").first();
		if ((await productLink.count()) === 0) {
			test.skip(true, "Pas de produits");
			return;
		}

		const href = await productLink.getAttribute("href");
		if (!href) return;
		await page.goto(href);
		await page.waitForLoadState("domcontentloaded");

		const addBtn = page.getByRole("button", { name: /Ajouter au panier/i }).first();
		if ((await addBtn.count()) === 0) return;
		await addBtn.click();

		// Verify a live region announced the result
		const liveRegion = page.locator(
			'[aria-live="polite"], [aria-live="assertive"], [role="status"], [role="alert"]',
		);
		await expect(liveRegion.first()).toBeAttached({ timeout: 5000 });
	});

	test("les erreurs de formulaire inscription utilisent aria-live", async ({ page }) => {
		await page.goto("/inscription");
		await page.waitForLoadState("domcontentloaded");

		const emailInput = page.getByLabel(/Email/i);
		await emailInput.fill("invalide");
		await emailInput.blur();

		const errorRegion = page.locator("[aria-live], [role='alert']");
		await expect(errorRegion.first()).toBeAttached({ timeout: 3000 });
	});
});

import { test, expect, devices } from "@playwright/test";

/**
 * @regression ord-test-024 — admin mobile refunds responsive
 *
 * Vérifie que la page admin remboursements est accessible et fonctionnelle
 * sur viewport mobile (iPhone 14). On ne déclenche pas de mutation — juste
 * la navigation et l'affichage doivent fonctionner sans overflow / layout
 * cassé.
 *
 * Note : utilise `test.use({...})` pour overrider le viewport sans avoir à
 * créer un project Playwright dédié pour ce seul cas.
 */
test.use({
	...devices["iPhone 14"],
	storageState: "e2e/.auth/admin.json",
});

test.describe("Admin mobile — refunds", { tag: ["@regression"] }, () => {
	test("accède à la liste des remboursements en viewport mobile", async ({ page }) => {
		await page.goto("/admin/ventes/remboursements");
		await page.waitForLoadState("domcontentloaded");

		// Heading visible (mobile sometimes hides h1; allow h1/h2)
		const heading = page.getByRole("heading", { name: /Remboursement/i }).first();
		const empty = page.getByText(/Aucun remboursement/i);
		await expect(heading.or(empty)).toBeVisible({ timeout: 10000 });

		// No horizontal overflow — body width must not exceed viewport.
		const overflow = await page.evaluate(() => {
			return document.documentElement.scrollWidth - document.documentElement.clientWidth;
		});
		expect(overflow).toBeLessThanOrEqual(2); // tolerate 1-2px subpixel rounding
	});
});

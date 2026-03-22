import { test, expect } from "../fixtures";

test.describe("Admin - Pagination cursor", { tag: ["@regression"] }, () => {
	test("la pagination est visible sur la page produits", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		// Pagination controls should be present
		const pagination = page.getByRole("navigation", { name: /Pagination/i });
		const paginationVisible = await pagination.isVisible().catch(() => false);

		if (!paginationVisible) {
			// Single page or empty — check that per-page select is still present
			const perPageSelect = page.getByLabel(/Nombre de résultats par page/i);
			await expect(perPageSelect).toBeVisible();
			return;
		}

		await expect(pagination).toBeVisible();
	});

	test("naviguer page suivante met a jour l'URL", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextVisible = await nextButton.isVisible().catch(() => false);
		test.skip(!nextVisible, "No next page button - not enough data for pagination");

		await nextButton.click();
		await page.waitForLoadState("domcontentloaded");

		// URL should contain cursor and direction params
		const url = page.url();
		expect(url).toContain("cursor=");
		expect(url).toContain("direction=forward");
	});

	test("naviguer page precedente met a jour l'URL", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		// First, go to page 2
		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextVisible = await nextButton.isVisible().catch(() => false);
		test.skip(!nextVisible, "No next page button - not enough data for pagination");

		await nextButton.click();
		await page.waitForLoadState("domcontentloaded");

		// Then go back
		const prevButton = page.getByRole("button", { name: /Page précédente/i });
		await expect(prevButton).toBeEnabled();
		await prevButton.click();
		await page.waitForLoadState("domcontentloaded");

		const url = page.url();
		expect(url).toContain("direction=backward");
	});

	test("retour au debut supprime le cursor de l'URL", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextVisible = await nextButton.isVisible().catch(() => false);
		test.skip(!nextVisible, "No next page button - not enough data for pagination");

		// Go to page 2
		await nextButton.click();
		await page.waitForLoadState("domcontentloaded");
		expect(page.url()).toContain("cursor=");

		// Click reset
		const resetButton = page.getByRole("button", { name: /Retour au début/i });
		await expect(resetButton).toBeEnabled();
		await resetButton.click();
		await page.waitForLoadState("domcontentloaded");

		// URL should no longer have cursor or direction
		const url = page.url();
		expect(url).not.toContain("cursor=");
		expect(url).not.toContain("direction=");
	});

	test("changer le nombre par page reset le cursor", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		// First navigate to page 2 if possible
		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextVisible = await nextButton.isVisible().catch(() => false);

		if (nextVisible) {
			await nextButton.click();
			await page.waitForLoadState("domcontentloaded");
			expect(page.url()).toContain("cursor=");
		}

		// Change per-page
		const perPageTrigger = page.getByLabel(/Nombre de résultats par page/i);
		await expect(perPageTrigger).toBeVisible();
		await perPageTrigger.click();

		// Select 50
		const option50 = page.getByRole("option", { name: "50" });
		const option50Visible = await option50.isVisible().catch(() => false);
		test.skip(!option50Visible, "No per-page option 50 found");

		await option50.click();
		await page.waitForLoadState("domcontentloaded");

		// URL should have perPage=50 but no cursor
		const url = page.url();
		expect(url).toContain("perPage=50");
		expect(url).not.toContain("cursor=");
	});

	test("le status badge indique la position courante", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const pagination = page.getByRole("navigation", { name: /Pagination/i });
		const paginationVisible = await pagination.isVisible().catch(() => false);
		test.skip(!paginationVisible, "No pagination visible");

		// On first page, should show "Première page"
		await expect(page.getByText("Première page")).toBeVisible();

		// Navigate to next page
		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextEnabled = await nextButton.isEnabled().catch(() => false);
		test.skip(!nextEnabled, "Next button not enabled");

		await nextButton.click();
		await page.waitForLoadState("domcontentloaded");

		// Should show "Suite" or "Dernière page"
		const suite = page.getByText("Suite");
		const derniere = page.getByText("Dernière page");
		await expect(suite.or(derniere)).toBeVisible({ timeout: 5000 });
	});

	test("les raccourcis clavier Alt+Fleche fonctionnent", async ({ page, adminPage }) => {
		await adminPage.gotoProducts();

		const nextButton = page.getByRole("button", { name: /Page suivante/i });
		const nextVisible = await nextButton.isVisible().catch(() => false);
		test.skip(!nextVisible, "No next page button - not enough data for pagination");

		// Use Alt+ArrowRight to go next
		await page.keyboard.press("Alt+ArrowRight");
		await page.waitForLoadState("domcontentloaded");

		expect(page.url()).toContain("cursor=");
		expect(page.url()).toContain("direction=forward");

		// Use Alt+ArrowLeft to go back
		await page.keyboard.press("Alt+ArrowLeft");
		await page.waitForLoadState("domcontentloaded");

		expect(page.url()).toContain("direction=backward");
	});
});

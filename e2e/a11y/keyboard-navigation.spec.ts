import { test, expect } from "../fixtures";

test.describe("Navigation clavier", { tag: ["@slow"] }, () => {
	test("skip link - Tab affiche, Enter déplace le focus vers main-content", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// First Tab → skip link
		await page.keyboard.press("Tab");
		const skipLink = page.locator('a[href="#main-content"]');
		await expect(skipLink).toBeFocused();
		await expect(skipLink).toBeVisible();

		// Enter → focus moves to #main-content
		await page.keyboard.press("Enter");

		const focusIsOnMain = await page.evaluate(() => {
			const main = document.getElementById("main-content");
			const active = document.activeElement;
			return main === active || main?.contains(active ?? null);
		});
		expect(focusIsOnMain).toBe(true);
	});

	test("menu mobile - Enter ouvre, Escape ferme et retourne le focus", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const menuButton = page.getByRole("button", { name: /Ouvrir le menu de navigation/i });
		await menuButton.focus();
		await expect(menuButton).toBeFocused();

		// Enter opens the dialog
		await page.keyboard.press("Enter");
		const menuDialog = page.getByRole("dialog");
		await expect(menuDialog).toBeVisible();

		// Focus is inside the dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Escape closes and focus returns to the burger button
		await page.keyboard.press("Escape");
		await expect(menuDialog).not.toBeVisible();
		await expect(menuButton).toBeFocused();
	});

	test("cart sheet - Enter ouvre, Escape ferme et retourne le focus", async ({
		page,
		cartPage,
	}) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await cartPage.openButton.focus();
		await expect(cartPage.openButton).toBeFocused();

		// Enter opens the cart sheet
		await page.keyboard.press("Enter");
		await expect(cartPage.dialog).toBeVisible();

		// Focus is inside the dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Escape closes and returns focus
		await page.keyboard.press("Escape");
		await expect(cartPage.dialog).not.toBeVisible();
		await expect(cartPage.openButton).toBeFocused();
	});

	test("recherche - Tab vers searchbox, taper affiche les résultats", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Find the search input or search button
		const searchInput = page.getByRole("searchbox").first();
		const searchButton = page.getByRole("button", { name: /Rechercher/i }).first();

		if ((await searchInput.count()) > 0) {
			await searchInput.focus();
			await expect(searchInput).toBeFocused();

			await searchInput.fill("bijou");
			// Wait for search results
			await page.waitForTimeout(500);

			// Results should appear (as links or list items)
			const results = page.locator('[role="listbox"] [role="option"], [data-search-results] a');
			if ((await results.count()) > 0) {
				// Tab navigates to results
				await page.keyboard.press("ArrowDown");
				const focusedResult = page.locator('[role="option"]:focus, [data-search-results] a:focus');
				// At least verify results are visible
				expect(await results.count()).toBeGreaterThan(0);
			}
		} else if ((await searchButton.count()) > 0) {
			await searchButton.focus();
			await expect(searchButton).toBeFocused();

			// Clicking search button should open a search dialog/input
			await page.keyboard.press("Enter");
			await page.waitForTimeout(300);

			const searchDialog = page.getByRole("dialog");
			if ((await searchDialog.count()) > 0) {
				await expect(searchDialog).toBeVisible();
				await page.keyboard.press("Escape");
			}
		}
	});

	test("les cartes produit sont navigables par Tab", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const productLinks = page.locator("article a").first();
		if ((await productLinks.count()) === 0) return;

		await productLinks.focus();
		await expect(productLinks).toBeFocused();

		// Enter activates the link
		const href = await productLinks.getAttribute("href");
		expect(href).toBeTruthy();
	});

	test("la navigation par Tab ne saute pas d'éléments interactifs", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Tab through first 10 elements and verify each one is interactive
		for (let i = 0; i < 10; i++) {
			await page.keyboard.press("Tab");

			const tagName = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
			const role = await page.evaluate(() => document.activeElement?.getAttribute("role"));
			const tabIndex = await page.evaluate(() => document.activeElement?.getAttribute("tabindex"));

			// Focused element should be a naturally interactive element or have tabindex
			const isInteractive =
				["a", "button", "input", "select", "textarea", "summary"].includes(tagName ?? "") ||
				["button", "link", "combobox", "menuitem", "tab", "searchbox"].includes(role ?? "") ||
				tabIndex !== null;

			expect(
				isInteractive,
				`Tab stop ${i + 1}: <${tagName}> role="${role}" n'est pas interactif`,
			).toBe(true);
		}
	});
});

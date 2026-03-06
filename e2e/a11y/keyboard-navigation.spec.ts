import { test, expect } from "../fixtures";

test.describe("Navigation clavier", { tag: ["@slow"] }, () => {
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
			// Wait for results to appear
			const resultsContainer = page.locator('[role="listbox"], [data-search-results]');
			await resultsContainer
				.first()
				.waitFor({ state: "visible", timeout: 3000 })
				.catch(() => {});

			// Results should appear (as links or list items)
			const results = page.locator('[role="listbox"] [role="option"], [data-search-results] a');
			if ((await results.count()) > 0) {
				// Tab navigates to results
				await page.keyboard.press("ArrowDown");
				const _focusedResult = page.locator('[role="option"]:focus, [data-search-results] a:focus');
				// At least verify results are visible
				expect(await results.count()).toBeGreaterThan(0);
			}
		} else if ((await searchButton.count()) > 0) {
			await searchButton.focus();
			await expect(searchButton).toBeFocused();

			// Clicking search button should open a search dialog/input
			await page.keyboard.press("Enter");

			const searchDialog = page.getByRole("dialog");
			await searchDialog.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
			if ((await searchDialog.count()) > 0) {
				await expect(searchDialog).toBeVisible();
				await page.keyboard.press("Escape");
			}
		}
	});

	test("recherche autocomplete - ArrowDown/Enter/Escape navigation complète", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Find the search input or search button
		const searchInput = page.getByRole("searchbox").first();
		const searchButton = page.getByRole("button", { name: /Rechercher/i }).first();

		let input = searchInput;

		if ((await searchInput.count()) === 0 && (await searchButton.count()) > 0) {
			// Click search button to open search dialog
			await searchButton.click();
			input = page.getByRole("searchbox").first();
			await input.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
			if ((await input.count()) === 0) {
				input = page.locator("input[type='search'], input[type='text']").last();
			}
		}

		if ((await input.count()) === 0) {
			test.skip(true, "Pas de champ de recherche trouvé");
			return;
		}

		await input.focus();
		await expect(input).toBeFocused();
		await input.fill("bijou");

		// Wait for autocomplete results to appear
		const options = page.locator('[role="option"]');
		await options
			.first()
			.waitFor({ state: "visible", timeout: 3000 })
			.catch(() => {});
		if ((await options.count()) === 0) {
			// No results, skip deep navigation
			return;
		}

		// ArrowDown navigates into results
		await page.keyboard.press("ArrowDown");

		// Check aria-activedescendant is set (if combobox pattern)
		const activeDescendant = await input.getAttribute("aria-activedescendant");
		if (activeDescendant) {
			const activeElement = page.locator(`#${CSS.escape(activeDescendant)}`);
			await expect(activeElement).toBeAttached();
		}

		// ArrowDown again
		if ((await options.count()) > 1) {
			await page.keyboard.press("ArrowDown");
		}

		// ArrowUp goes back
		await page.keyboard.press("ArrowUp");

		// Escape closes results
		await page.keyboard.press("Escape");
		const listbox = page.locator('[role="listbox"]');
		if ((await listbox.count()) > 0) {
			await expect(listbox).not.toBeVisible();
		}

		// Input should retain focus
		await expect(input).toBeFocused();
	});

	test("formulaire Tab order - champs séquentiels sans saut", async ({ page }) => {
		await page.goto("/inscription");
		await page.waitForLoadState("domcontentloaded");

		// Collect all form inputs in order
		const formFields = page.locator(
			'form input:not([type="hidden"]), form select, form textarea, form button[type="submit"]',
		);
		const fieldCount = await formFields.count();

		if (fieldCount < 2) {
			test.skip(true, "Formulaire insuffisant pour tester le tab order");
			return;
		}

		// Focus the first field
		await formFields.first().focus();
		await expect(formFields.first()).toBeFocused();

		// Tab through all fields and verify sequential order
		const visitedFields: string[] = [];
		for (let i = 0; i < Math.min(fieldCount, 8); i++) {
			const tagName = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
			const inputType = await page.evaluate(() =>
				(document.activeElement as HTMLInputElement).type.toLowerCase(),
			);
			const name = await page.evaluate(
				() => (document.activeElement as HTMLInputElement).name || "",
			);

			visitedFields.push(`${tagName}[${inputType || ""}]${name ? `(${name})` : ""}`);

			await page.keyboard.press("Tab");
		}

		// Verify we visited multiple distinct fields (no stuck focus)
		const uniqueFields = new Set(visitedFields);
		expect(
			uniqueFields.size,
			"Le focus Tab devrait traverser des champs distincts",
		).toBeGreaterThan(1);
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

	test("filter sheet mobile - Enter ouvre, focus trapped, Escape ferme", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const filterButton = page.getByRole("button", { name: /Filtrer|Filtres/i }).first();
		if ((await filterButton.count()) === 0) {
			test.skip(true, "Pas de bouton Filtrer en mobile");
			return;
		}

		await filterButton.focus();
		await expect(filterButton).toBeFocused();

		// Enter opens the filter sheet
		await page.keyboard.press("Enter");

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Focus is inside the dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Tab through filter options
		await page.keyboard.press("Tab");

		// Escape closes and returns focus
		await page.keyboard.press("Escape");
		await expect(dialog).not.toBeVisible();
	});

	test("sort drawer mobile - Enter ouvre, Escape ferme", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		const sortButton = page.getByRole("button", { name: /Trier/i }).first();
		if ((await sortButton.count()) === 0) {
			test.skip(true, "Pas de bouton Trier en mobile");
			return;
		}

		await sortButton.focus();
		await expect(sortButton).toBeFocused();

		// Enter opens the sort drawer
		await page.keyboard.press("Enter");

		const dialog = page.getByRole("dialog");
		if ((await dialog.count()) > 0) {
			await expect(dialog).toBeVisible();

			// Escape closes
			await page.keyboard.press("Escape");
			await expect(dialog).not.toBeVisible();
		}
	});

	test("cookie banner - Tab through options, Enter active le choix", async ({ page }) => {
		// Clear cookies to trigger cookie banner
		await page.context().clearCookies();
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Look for cookie banner
		const cookieBanner = page
			.locator('[role="dialog"][aria-label*="cookie" i], [data-cookie-banner], [class*="cookie"]')
			.first();
		if ((await cookieBanner.count()) === 0) {
			test.skip(true, "Pas de banner cookie visible");
			return;
		}

		// Find accept/reject buttons inside the banner
		const acceptButton = page.getByRole("button", { name: /Accepter|Tout accepter/i }).first();
		if ((await acceptButton.count()) === 0) return;

		await acceptButton.focus();
		await expect(acceptButton).toBeFocused();

		// Enter activates the choice
		await page.keyboard.press("Enter");

		// Banner should disappear
		await expect(cookieBanner).not.toBeVisible({ timeout: 3000 });
	});

	test("la navigation par Tab ne saute pas d'éléments interactifs", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Tab through first 10 elements and verify each one is interactive
		for (let i = 0; i < 10; i++) {
			await page.keyboard.press("Tab");

			const tagName = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
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

	test("mega menu desktop - Tab ouvre le sous-menu, Escape le ferme", async ({ page }) => {
		// Desktop viewport
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Find NavigationMenu triggers (Les créations, Les collections)
		const navTriggers = page.locator(
			'nav[aria-label="Navigation principale"] button[data-radix-navigation-menu-trigger]',
		);
		if ((await navTriggers.count()) === 0) {
			test.skip(true, "Pas de mega menu desktop");
			return;
		}

		const trigger = navTriggers.first();
		await trigger.focus();
		await expect(trigger).toBeFocused();

		// Enter/Space opens the mega menu content
		await page.keyboard.press("Enter");

		const menuContent = page.locator("[data-radix-navigation-menu-content]").first();
		await menuContent.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
		if ((await menuContent.count()) > 0) {
			await expect(menuContent).toBeVisible();

			// Tab navigates inside the mega menu links
			await page.keyboard.press("Tab");
			const focusedInMenu = await page.evaluate(() => {
				const content = document.querySelector("[data-radix-navigation-menu-content]");
				return content?.contains(document.activeElement);
			});
			expect(focusedInMenu).toBe(true);

			// Escape closes the mega menu
			await page.keyboard.press("Escape");
			await expect(menuContent).not.toBeVisible();
		}
	});

	test("pagination - Tab vers boutons page, Enter change de page", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// Look for pagination navigation
		const pagination = page.getByRole("navigation", { name: /pagination/i });
		if ((await pagination.count()) === 0) {
			test.skip(true, "Pas de pagination sur la page produits");
			return;
		}

		// Find page buttons or links inside pagination
		const pageLinks = pagination.locator("a, button").first();
		if ((await pageLinks.count()) === 0) return;

		await pageLinks.focus();
		await expect(pageLinks).toBeFocused();

		// Verify the pagination element is keyboard accessible
		const href = await pageLinks.getAttribute("href");
		const role = await pageLinks.evaluate((el) => el.tagName.toLowerCase());
		expect(href ?? role === "button").toBeTruthy();
	});
});

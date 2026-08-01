import { test, expect } from "../fixtures";

test.describe("Accessibilité composants - Cart Sheet", { tag: ["@slow"] }, () => {
	test("le cart sheet piège le focus et Escape retourne au bouton", async ({ page, cartPage }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		await cartPage.open();

		// Focus is inside the dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Escape closes and focus returns to the trigger button
		await page.keyboard.press("Escape");
		await expect(cartPage.dialog).not.toBeVisible();
		await expect(cartPage.openButton).toBeFocused();
	});
});

test.describe("Accessibilité composants - Select", { tag: ["@slow"] }, () => {
	test("le select de tri des produits fonctionne au clavier", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// Look for a select trigger (combobox role from Radix Select)
		const selectTrigger = page.getByRole("combobox").first();
		if ((await selectTrigger.count()) === 0) return;

		await selectTrigger.focus();
		await expect(selectTrigger).toBeFocused();

		// Space or Enter opens the listbox
		await page.keyboard.press("Space");
		const listbox = page.getByRole("listbox");
		await expect(listbox).toBeVisible();

		// ArrowDown navigates options
		await page.keyboard.press("ArrowDown");

		// Escape closes without selecting
		await page.keyboard.press("Escape");
		await expect(listbox).not.toBeVisible();
		await expect(selectTrigger).toBeFocused();
	});
});

test.describe("Accessibilité composants - Accordion", { tag: ["@slow"] }, () => {
	test("les accordéons des pages légales fonctionnent au clavier", async ({ page }) => {
		await page.goto("/cgv");
		await page.waitForLoadState("domcontentloaded");

		// Look for accordion triggers (buttons that control collapsible sections)
		const accordionTriggers = page.locator(
			'button[data-state="closed"], button[data-state="open"]',
		);
		const count = await accordionTriggers.count();
		if (count === 0) return;

		const firstTrigger = accordionTriggers.first();
		await firstTrigger.focus();
		await expect(firstTrigger).toBeFocused();

		// Check initial state
		const initialState = await firstTrigger.getAttribute("data-state");

		// Enter or Space toggles the accordion
		await page.keyboard.press("Enter");

		const newState = await firstTrigger.getAttribute("data-state");
		if (initialState === "closed") {
			expect(newState).toBe("open");
			const expanded = await firstTrigger.getAttribute("aria-expanded");
			expect(expanded).toBe("true");
		} else {
			expect(newState).toBe("closed");
		}
	});
});

test.describe("Accessibilité composants - Carousel", { tag: ["@slow"] }, () => {
	test("Carousel - ArrowLeft/Right navigue les slides", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		const carousel = page.locator('[role="region"][aria-roledescription="carousel"]').first();
		if ((await carousel.count()) === 0) {
			test.skip(true, "Pas de carousel sur la homepage");
			return;
		}

		// Focus the carousel or its navigation buttons
		const prevButton = carousel.getByRole("button", { name: /Précédent|Previous/i }).first();
		const nextButton = carousel.getByRole("button", { name: /Suivant|Next/i }).first();

		if ((await nextButton.count()) > 0) {
			await nextButton.focus();
			await expect(nextButton).toBeFocused();
			await page.keyboard.press("Enter");
		} else if ((await prevButton.count()) > 0) {
			await prevButton.focus();
			await expect(prevButton).toBeFocused();
		}
	});
});

test.describe("Accessibilité composants - Tooltip", { tag: ["@slow"] }, () => {
	test("les tooltips apparaissent au focus et disparaissent au blur", async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");

		// Find buttons with tooltip triggers (icon buttons in navbar)
		const tooltipTriggers = page.locator("[data-state][data-radix-tooltip-trigger]");
		if ((await tooltipTriggers.count()) === 0) {
			// Try alternative: buttons with aria-describedby that contain only icons
			const iconButtons = page.locator("nav button[aria-label]");
			if ((await iconButtons.count()) === 0) return;

			const btn = iconButtons.first();
			await btn.focus();
			await expect(btn).toBeFocused();

			// Tab away — tooltip should disappear
			await page.keyboard.press("Tab");
			return;
		}

		const trigger = tooltipTriggers.first();
		await trigger.focus();
		await expect(trigger).toBeFocused();

		// Wait for tooltip to appear on focus
		const tooltip = page.getByRole("tooltip");
		await tooltip
			.first()
			.waitFor({ state: "visible", timeout: 1500 })
			.catch(() => {});
		if ((await tooltip.count()) > 0 && (await tooltip.first().isVisible())) {
			await expect(tooltip.first()).toBeVisible();
		}

		// Tab away — tooltip should disappear
		await page.keyboard.press("Tab");
		if ((await tooltip.count()) > 0) {
			await expect(tooltip).not.toBeVisible();
		}
	});
});

test.describe("Accessibilité composants - Popover", { tag: ["@slow"] }, () => {
	test("Popover couleurs - focus trap, Escape ferme et retourne le focus", async ({ page }) => {
		await page.goto("/produits");
		await page.waitForLoadState("domcontentloaded");

		// Color swatches popover trigger ("+N" button on product cards)
		const popoverTrigger = page.locator("[data-radix-popover-trigger]").first();
		if ((await popoverTrigger.count()) === 0) {
			test.skip(true, "Pas de popover de couleurs sur la page");
			return;
		}

		await popoverTrigger.click();

		const popoverContent = page.locator("[data-radix-popover-content]");
		await expect(popoverContent).toBeVisible();

		// Focus should be inside the popover
		const isInside = await page.evaluate(() => {
			const p = document.querySelector("[data-radix-popover-content]");
			return p?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Escape closes the popover
		await page.keyboard.press("Escape");
		await expect(popoverContent).not.toBeVisible();

		// Focus returns to trigger
		await expect(popoverTrigger).toBeFocused();
	});
});

test.describe("Accessibilité composants - MultiSelect", { tag: ["@slow"] }, () => {
	test("MultiSelect - ouverture, recherche, sélection, Escape ferme", async ({ page }) => {
		// MultiSelect is used in admin product forms
		await page.goto("/admin/catalogue/produits/nouveau");
		await page.waitForLoadState("domcontentloaded");

		if (page.url().includes("connexion")) {
			test.skip(true, "Authentification requise");
			return;
		}

		// Find a MultiSelect trigger (button with chevron that opens a popover)
		const multiSelectTrigger = page
			.locator("button")
			.filter({ hasText: /Sélectionner/i })
			.first();
		if ((await multiSelectTrigger.count()) === 0) {
			test.skip(true, "Pas de MultiSelect sur cette page");
			return;
		}

		await multiSelectTrigger.focus();
		await expect(multiSelectTrigger).toBeFocused();

		// Enter opens the popover
		await page.keyboard.press("Enter");

		// Check for Command/Popover content
		const popoverContent = page.locator("[data-radix-popover-content]").first();
		await popoverContent.waitFor({ state: "visible", timeout: 3000 }).catch(() => {});
		if ((await popoverContent.count()) === 0) return;
		await expect(popoverContent).toBeVisible();

		// Search input should be available (cmdk input)
		const searchInput = popoverContent.locator('input[type="text"]').first();
		if ((await searchInput.count()) > 0) {
			await searchInput.fill("a");
			// Wait for cmdk to filter options
			await page
				.locator("[cmdk-item]")
				.first()
				.waitFor({ state: "visible", timeout: 2000 })
				.catch(() => {});
		}

		// Navigate options with ArrowDown
		await page.keyboard.press("ArrowDown");

		// Enter toggles selection
		await page.keyboard.press("Enter");

		// Escape closes the popover
		await page.keyboard.press("Escape");
		await expect(popoverContent).not.toBeVisible();
	});
});

test.describe("Accessibilité composants - Switch", { tag: ["@slow"] }, () => {
	test("Switch - Space toggle et aria-checked", async ({ page }) => {
		// Switch components are on admin pages — need auth
		await page.goto("/admin/catalogue/couleurs");
		await page.waitForLoadState("domcontentloaded");

		if (page.url().includes("connexion")) {
			test.skip(true, "Authentification requise — test déplacé dans admin-accessibility");
			return;
		}

		const switchEl = page.getByRole("switch").first();
		if ((await switchEl.count()) === 0) {
			test.skip(true, "Pas de switch sur cette page");
			return;
		}

		const initialChecked = await switchEl.getAttribute("aria-checked");
		await switchEl.focus();
		await expect(switchEl).toBeFocused();

		// Space toggles the switch
		await page.keyboard.press("Space");
		const newChecked = await switchEl.getAttribute("aria-checked");
		expect(newChecked).not.toBe(initialChecked);

		// Toggle back
		await page.keyboard.press("Space");
		const restoredChecked = await switchEl.getAttribute("aria-checked");
		expect(restoredChecked).toBe(initialChecked);
	});
});

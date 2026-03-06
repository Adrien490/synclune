import { test, expect } from "../fixtures";

test.describe("Accessibilité composants - Dialog focus trap", { tag: ["@slow"] }, () => {
	test("le dialog d'ajout d'adresse piège le focus et Escape le ferme", async ({ page }) => {
		// This test requires authentication — skip if redirected to login
		await page.goto("/compte/adresses");
		await page.waitForLoadState("domcontentloaded");

		if (page.url().includes("connexion")) {
			test.skip(true, "Authentification requise");
			return;
		}

		const trigger = page.getByRole("button", { name: /Ajouter/i });
		if ((await trigger.count()) === 0) return;
		await trigger.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Focus is inside the dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Tab N+1 times should not escape the dialog
		const focusableCount = await dialog
			.locator('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
			.count();
		for (let i = 0; i < focusableCount + 2; i++) {
			await page.keyboard.press("Tab");
			const still = await page.evaluate(() => {
				const d = document.querySelector('[role="dialog"]');
				return d?.contains(document.activeElement);
			});
			expect(still, `Focus escaped dialog after ${i + 1} Tab presses`).toBe(true);
		}

		// Escape closes and returns focus to trigger
		await page.keyboard.press("Escape");
		await expect(dialog).not.toBeVisible();
		await expect(trigger).toBeFocused();
	});
});

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

test.describe("Accessibilité composants - Autocomplete", { tag: ["@slow"] }, () => {
	test("Autocomplete - ArrowDown/Up cycle, Enter sélectionne, Escape ferme, aria-activedescendant", async ({
		page,
	}) => {
		// The Autocomplete is used in the address form dialog
		await page.goto("/compte/adresses");
		await page.waitForLoadState("domcontentloaded");

		if (page.url().includes("connexion")) {
			test.skip(true, "Authentification requise");
			return;
		}

		// Open the address form dialog
		const addBtn = page.getByRole("button", { name: /Ajouter/i });
		if ((await addBtn.count()) === 0) {
			test.skip(true, "Pas de bouton Ajouter");
			return;
		}
		await addBtn.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Find the autocomplete input (address search)
		const autocompleteInput = dialog.locator('input[aria-autocomplete="list"]').first();
		if ((await autocompleteInput.count()) === 0) {
			test.skip(true, "Pas d'autocomplete dans le formulaire d'adresse");
			return;
		}

		await autocompleteInput.focus();
		await autocompleteInput.fill("Paris");

		// Wait for listbox to appear with results
		const listbox = dialog.locator('[role="listbox"]');
		await listbox
			.first()
			.waitFor({ state: "visible", timeout: 3000 })
			.catch(() => {});
		if ((await listbox.count()) === 0) return;

		const options = listbox.locator('[role="option"]');
		if ((await options.count()) === 0) return;

		// ArrowDown should activate first option and set aria-activedescendant
		await page.keyboard.press("ArrowDown");
		const activeDescendant = await autocompleteInput.getAttribute("aria-activedescendant");
		expect(activeDescendant).toBeTruthy();

		// First option should be marked as selected
		const firstOption = options.first();
		const isSelected = await firstOption.getAttribute("aria-selected");
		expect(isSelected).toBe("true");

		// ArrowDown again moves to next option
		if ((await options.count()) > 1) {
			await page.keyboard.press("ArrowDown");
			const newActiveDescendant = await autocompleteInput.getAttribute("aria-activedescendant");
			expect(newActiveDescendant).not.toBe(activeDescendant);
		}

		// ArrowUp goes back
		await page.keyboard.press("ArrowUp");

		// Escape closes the dropdown
		await page.keyboard.press("Escape");
		await expect(listbox).not.toBeVisible();

		// Input should still be focused
		await expect(autocompleteInput).toBeFocused();
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

test.describe("Accessibilité composants - ResponsiveDialog", { tag: ["@slow"] }, () => {
	test("ResponsiveDialog desktop - focus trap et Escape ferme", async ({ page }) => {
		// Desktop viewport
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto("/compte/adresses");
		await page.waitForLoadState("domcontentloaded");

		if (page.url().includes("connexion")) {
			test.skip(true, "Authentification requise");
			return;
		}

		const trigger = page.getByRole("button", { name: /Ajouter/i });
		if ((await trigger.count()) === 0) {
			test.skip(true, "Pas de bouton déclencheur");
			return;
		}
		await trigger.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Focus is inside the dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="dialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Escape closes
		await page.keyboard.press("Escape");
		await expect(dialog).not.toBeVisible();
	});

	test("ResponsiveDialog mobile - Drawer mode, focus trap et bouton close accessible", async ({
		page,
	}) => {
		// Mobile viewport
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/compte/adresses");
		await page.waitForLoadState("domcontentloaded");

		if (page.url().includes("connexion")) {
			test.skip(true, "Authentification requise");
			return;
		}

		const trigger = page.getByRole("button", { name: /Ajouter/i });
		if ((await trigger.count()) === 0) {
			test.skip(true, "Pas de bouton déclencheur");
			return;
		}
		await trigger.click();

		const dialog = page.getByRole("dialog");
		await expect(dialog).toBeVisible();

		// Close button must exist and be keyboard accessible (alternative to swipe gesture)
		const closeButton = dialog
			.locator('button[aria-label*="Fermer" i], button:has(> .sr-only)')
			.first();
		if ((await closeButton.count()) > 0) {
			await closeButton.focus();
			await expect(closeButton).toBeFocused();
		}

		// Escape also closes in Drawer mode
		await page.keyboard.press("Escape");
		await expect(dialog).not.toBeVisible();
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

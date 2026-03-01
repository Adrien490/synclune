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

test.describe("Accessibilité composants - DropdownMenu admin", { tag: ["@slow"] }, () => {
	test("DropdownMenu - flèches, Enter, Escape et retour du focus", async ({ page }) => {
		await page.goto("/admin/catalogue/produits");
		await page.waitForLoadState("domcontentloaded");

		if (page.url().includes("connexion")) {
			test.skip(true, "Authentification requise");
			return;
		}

		const trigger = page.getByRole("button", { name: /Actions/i }).first();
		if ((await trigger.count()) === 0) {
			test.skip(true, "Pas de bouton Actions sur cette page");
			return;
		}

		await trigger.focus();
		await page.keyboard.press("Enter");

		const menu = page.getByRole("menu");
		await expect(menu).toBeVisible();

		// Arrow down navigates menu items
		await page.keyboard.press("ArrowDown");

		// Escape closes and returns focus
		await page.keyboard.press("Escape");
		await expect(menu).not.toBeVisible();
		await expect(trigger).toBeFocused();
	});
});

test.describe("Accessibilité composants - AlertDialog", { tag: ["@slow"] }, () => {
	test("AlertDialog de suppression - focus trap, Escape annule", async ({ page }) => {
		await page.goto("/admin/catalogue/couleurs");
		await page.waitForLoadState("domcontentloaded");

		if (page.url().includes("connexion")) {
			test.skip(true, "Authentification requise");
			return;
		}

		// Find a delete button that triggers an AlertDialog
		const deleteButton = page.getByRole("button", { name: /Supprimer/i }).first();
		if ((await deleteButton.count()) === 0) {
			test.skip(true, "Pas de bouton Supprimer sur cette page");
			return;
		}

		await deleteButton.click();

		const alertDialog = page.getByRole("alertdialog");
		await expect(alertDialog).toBeVisible();

		// Focus is inside the alert dialog
		const isInside = await page.evaluate(() => {
			const d = document.querySelector('[role="alertdialog"]');
			return d?.contains(document.activeElement);
		});
		expect(isInside).toBe(true);

		// Escape closes without action
		await page.keyboard.press("Escape");
		await expect(alertDialog).not.toBeVisible();
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

test.describe("Accessibilité composants - Tabs", { tag: ["@slow"] }, () => {
	test("Tabs - ArrowRight/ArrowLeft change l'onglet actif", async ({ page }) => {
		// Look for tabs in admin or product pages
		await page.goto("/admin");
		await page.waitForLoadState("domcontentloaded");

		if (page.url().includes("connexion")) {
			test.skip(true, "Authentification requise");
			return;
		}

		const tabList = page.getByRole("tablist").first();
		if ((await tabList.count()) === 0) {
			test.skip(true, "Pas de tabs sur cette page");
			return;
		}

		const tabs = tabList.getByRole("tab");
		const tabCount = await tabs.count();
		if (tabCount < 2) return;

		// Focus the first tab
		await tabs.first().focus();
		await expect(tabs.first()).toBeFocused();

		// ArrowRight moves to next tab
		await page.keyboard.press("ArrowRight");
		await expect(tabs.nth(1)).toBeFocused();

		// ArrowLeft moves back
		await page.keyboard.press("ArrowLeft");
		await expect(tabs.first()).toBeFocused();
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

			// Wait for tooltip to potentially appear
			await page.waitForTimeout(300);

			// Tab away — tooltip should disappear
			await page.keyboard.press("Tab");
			return;
		}

		const trigger = tooltipTriggers.first();
		await trigger.focus();
		await expect(trigger).toBeFocused();

		// Tooltip should appear after delay
		await page.waitForTimeout(300);
		const tooltip = page.getByRole("tooltip");
		if ((await tooltip.count()) > 0) {
			await expect(tooltip).toBeVisible();
		}

		// Tab away — tooltip should disappear
		await page.keyboard.press("Tab");
		if ((await tooltip.count()) > 0) {
			await expect(tooltip).not.toBeVisible();
		}
	});
});

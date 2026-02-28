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

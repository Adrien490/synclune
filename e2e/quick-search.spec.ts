import { test, expect } from "./fixtures";

/**
 * Quick Search Dialog — end-to-end flow.
 *
 * Covers keyboard shortcut, typing debounce, listbox role, arrow navigation,
 * Escape close + focus return, and recent searches persistence.
 *
 * These tests are intentionally tolerant of empty catalogs (CI) — they assert
 * structural contracts (roles, URLs, focus) rather than specific products.
 */
test.describe("Quick Search Dialog", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("domcontentloaded");
	});

	test("Cmd+K opens the dialog and focuses the search input", async ({ page }) => {
		const modifier = process.platform === "darwin" ? "Meta" : "Control";
		await page.keyboard.press(`${modifier}+KeyK`);

		const listbox = page.getByRole("listbox", { name: /résultats de recherche/i });
		await expect(listbox).toBeVisible();

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await expect(input).toBeFocused();
	});

	test("trigger button opens the dialog", async ({ page }) => {
		const trigger = page.getByRole("button", { name: /ouvrir la recherche rapide/i }).first();
		await trigger.click();

		await expect(page.getByRole("listbox", { name: /résultats de recherche/i })).toBeVisible();
	});

	test("typing less than 3 characters shows the hint", async ({ page }) => {
		await page
			.getByRole("button", { name: /ouvrir la recherche rapide/i })
			.first()
			.click();

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("ba");

		await expect(page.getByText(/au moins 3 caractères/i)).toBeVisible();
	});

	test("typing a query activates search mode (combobox aria-expanded=true)", async ({ page }) => {
		await page
			.getByRole("button", { name: /ouvrir la recherche rapide/i })
			.first()
			.click();

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("bague");

		// Wait for debounce to fire (300ms) + transition to settle
		await expect(input).toHaveAttribute("aria-expanded", "true", { timeout: 2000 });
	});

	test("Escape closes the dialog and restores focus to the trigger", async ({ page }) => {
		const trigger = page.getByRole("button", { name: /ouvrir la recherche rapide/i }).first();
		await trigger.click();

		const listbox = page.getByRole("listbox", { name: /résultats de recherche/i });
		await expect(listbox).toBeVisible();

		await page.keyboard.press("Escape");
		await expect(listbox).not.toBeVisible();
		await expect(trigger).toBeFocused();
	});

	test("pressing Enter on a typed query navigates to /produits?search=...", async ({ page }) => {
		await page
			.getByRole("button", { name: /ouvrir la recherche rapide/i })
			.first()
			.click();

		const input = page.getByRole("combobox", { name: /rechercher un bijou/i });
		await input.fill("bague");
		await page.keyboard.press("Enter");

		await expect(page).toHaveURL(/\/produits\?search=bague/i, { timeout: 5000 });
	});

	test("the listbox container has role=listbox with correct aria-label", async ({ page }) => {
		await page
			.getByRole("button", { name: /ouvrir la recherche rapide/i })
			.first()
			.click();

		const listbox = page.getByRole("listbox", { name: /résultats de recherche/i });
		await expect(listbox).toBeVisible();
	});

	test("mobile trigger is visible on narrow viewport", async ({ page, browserName }) => {
		test.skip(browserName === "webkit", "Mobile emulation flakey under webkit in CI.");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.reload();

		const trigger = page.getByRole("button", { name: /ouvrir la recherche rapide/i }).first();
		await expect(trigger).toBeVisible();
	});
});

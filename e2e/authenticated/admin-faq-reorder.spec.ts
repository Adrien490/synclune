import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

test.describe("Admin - FAQ Drag & Drop Reorder", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ adminPage }) => {
		await adminPage.page.goto("/admin/contenu/faq");
		await adminPage.page.waitForLoadState("domcontentloaded");
	});

	test("la page FAQ affiche les questions", async ({ page }) => {
		// Wait for FAQ items to load (either list items or empty state)
		const faqItem = page.locator("[class*='rounded-lg'][class*='border']").first();
		const emptyState = page.getByText(/Aucune question FAQ/i);
		await expect(faqItem.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const hasFaqItems = await faqItem.isVisible();
		test.skip(!hasFaqItems, "No FAQ items to test reordering");
	});

	test("les boutons Move Up/Down sont presents (WCAG 2.5.7)", async ({ page }) => {
		const faqItems = page.locator("[class*='rounded-lg'][class*='border'][class*='bg-card']");
		await expect(faqItems.first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const count = await faqItems.count();
		test.skip(count < 2, "Need at least 2 FAQ items for reorder test");

		// First item: Move Up disabled, Move Down enabled
		const firstMoveUp = page.getByRole("button", { name: /Monter/i }).first();
		await expect(firstMoveUp).toBeDisabled();

		const firstMoveDown = page.getByRole("button", { name: /Descendre/i }).first();
		await expect(firstMoveDown).toBeEnabled();

		// Last item: Move Down disabled
		const lastMoveDown = page.getByRole("button", { name: /Descendre/i }).last();
		await expect(lastMoveDown).toBeDisabled();
	});

	test("reordonner via Move Down met a jour la liste", async ({ page }) => {
		const faqItems = page.locator("[class*='rounded-lg'][class*='border'][class*='bg-card']");
		await expect(faqItems.first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const count = await faqItems.count();
		test.skip(count < 2, "Need at least 2 FAQ items for reorder test");

		// Get first item's question text
		const firstItemText = await faqItems.first().locator("p.font-medium").textContent();

		// Click Move Down on first item
		const moveDown = page.getByRole("button", { name: /Descendre/i }).first();
		await moveDown.click();

		// First item should now be different (the previous second item moved up)
		const newFirstItemText = await faqItems.first().locator("p.font-medium").textContent();
		expect(newFirstItemText).not.toBe(firstItemText);

		// Aria-live region should announce the move
		const liveRegion = page.locator("[aria-live='polite']");
		await expect(liveRegion).toContainText(/déplacé en position/i);

		// Undo: move the displaced item back down
		const moveDownUndo = page.getByRole("button", { name: /Descendre/i }).first();
		await moveDownUndo.click();
	});

	test("le drag handle a les attributs d'accessibilite", async ({ page }) => {
		const faqItems = page.locator("[class*='rounded-lg'][class*='border'][class*='bg-card']");
		await expect(faqItems.first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		// Drag handle should have contextual aria-label
		const dragHandle = page.getByRole("button", { name: /Réordonner/i }).first();
		await expect(dragHandle).toBeVisible();
		await expect(dragHandle).toHaveAttribute("aria-describedby", "faq-drag-instructions");

		// Screen reader instructions should exist
		const instructions = page.locator("#faq-drag-instructions");
		await expect(instructions).toBeAttached();
	});

	test("les instructions de drag sont presentes pour les lecteurs d'ecran", async ({ page }) => {
		const faqItems = page.locator("[class*='rounded-lg'][class*='border'][class*='bg-card']");
		await expect(faqItems.first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		// sr-only drag instructions
		const instructions = page.locator("#faq-drag-instructions");
		await expect(instructions).toBeAttached();
		await expect(instructions).toContainText(/Espace ou Entrée/);

		// aria-live region exists
		const liveRegion = page.locator("[aria-live='polite'][aria-atomic='true']");
		await expect(liveRegion).toBeAttached();
	});
});

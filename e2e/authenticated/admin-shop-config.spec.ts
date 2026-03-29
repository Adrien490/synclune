import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

test.describe("Admin - Configuration boutique", { tag: ["@regression"] }, () => {
	test.beforeEach(async ({ adminPage }) => {
		await adminPage.gotoShopConfig();
	});

	test("affiche la page avec le titre", async ({ page }) => {
		const heading = page.getByRole("heading", { name: /Paramètres boutique/i });
		await expect(heading).toBeVisible();

		const description = page.getByText(/ouverture et.*fermeture/i);
		await expect(description).toBeVisible();
	});

	test("affiche le statut actuel de la boutique", async ({ page }) => {
		// Should show either "Ouverte" or "Fermée" badge
		const statusBadge = page.getByText(/Ouverte/i).or(page.getByText(/Fermée/i));
		await expect(statusBadge.first()).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("le toggle de fermeture est present", async ({ page }) => {
		// Switch field for "Boutique fermée"
		const toggle = page.getByLabel(/Boutique fermée/i).or(page.getByRole("switch"));
		await expect(toggle.first()).toBeVisible();
	});

	test("le bouton d'action est present avec le texte contextuel", async ({ page }) => {
		// Button should say "Fermer la boutique" or "Réouvrir la boutique"
		const actionButton = page.getByRole("button", {
			name: /Fermer la boutique|Réouvrir la boutique/i,
		});
		await expect(actionButton).toBeVisible();
	});

	test("fermer la boutique affiche le champ de message", async ({ page }) => {
		// Check current state
		const isOpen = await page
			.getByText(/Ouverte/i)
			.isVisible()
			.catch(() => false);

		if (isOpen) {
			// Toggle the closure switch
			const toggle = page.getByLabel(/Boutique fermée/i).or(page.getByRole("switch"));
			await toggle.first().click();

			// Message textarea should appear
			const messageField = page.getByLabel(/Message de fermeture/i);
			await expect(messageField).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

			// Date field should also appear
			const dateField = page.getByLabel(/Date de réouverture/i);
			await expect(dateField).toBeVisible();

			// Toggle back to not actually close
			await toggle.first().click();
		} else {
			// Already closed - message field should be visible
			const messageField = page.getByLabel(/Message de fermeture/i);
			await expect(messageField).toBeVisible();
		}
	});
});

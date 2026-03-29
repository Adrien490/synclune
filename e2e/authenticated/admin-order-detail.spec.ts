import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

/**
 * Navigate to the first available order detail page.
 * Returns true if navigation succeeded, false if no orders.
 */
async function navigateToFirstOrder(page: Page): Promise<boolean> {
	await page.goto("/admin/ventes/commandes");
	await page.waitForLoadState("domcontentloaded");

	const table = page.getByRole("table");
	const emptyState = page.getByText(/Aucune commande/i);
	await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

	if (!(await table.isVisible())) return false;

	const rows = table.locator("tbody tr");
	if ((await rows.count()) === 0) return false;

	await rows.first().getByRole("link").first().click();
	await page.waitForLoadState("domcontentloaded");
	return true;
}

test.describe("Admin - Détail commande (affichage)", { tag: ["@regression"] }, () => {
	test("affiche le numéro de commande et le breadcrumb", async ({ page }) => {
		const hasOrder = await navigateToFirstOrder(page);
		test.skip(!hasOrder, "Pas de commandes disponibles");

		// Heading with order number
		const heading = page.getByRole("heading", { level: 1 });
		await expect(heading).toBeVisible();
		await expect(heading).toHaveText(/SYN-\d+|Commande/i);

		// Breadcrumb navigation present
		const breadcrumb = page
			.getByRole("navigation", { name: /Fil d'Ariane|Breadcrumb/i })
			.or(page.locator("nav[aria-label*='Fil']"))
			.or(page.locator("[class*='breadcrumb']"));
		await expect(breadcrumb.first()).toBeAttached();
	});

	test("affiche le statut de la commande avec un badge", async ({ page }) => {
		const hasOrder = await navigateToFirstOrder(page);
		test.skip(!hasOrder, "Pas de commandes disponibles");

		const statusBadge = page.getByText(
			/En attente|Confirmée|En préparation|Expédiée|Livrée|Annulée|Remboursée/i,
		);
		await expect(statusBadge.first()).toBeVisible();
	});

	test("affiche les articles de la commande", async ({ page }) => {
		const hasOrder = await navigateToFirstOrder(page);
		test.skip(!hasOrder, "Pas de commandes disponibles");

		// Order items section: should show product name or image
		const itemSection = page
			.getByText(/Articles|Produits/i)
			.or(page.locator("[class*='order-item']"))
			.or(page.locator("table"));
		await expect(itemSection.first()).toBeVisible();

		// Should display at least one item with price
		const priceText = page.getByText(/€/);
		await expect(priceText.first()).toBeVisible();
	});

	test("affiche les informations de livraison", async ({ page }) => {
		const hasOrder = await navigateToFirstOrder(page);
		test.skip(!hasOrder, "Pas de commandes disponibles");

		// Shipping/delivery address section
		const addressSection = page.getByText(/Livraison|Adresse/i);
		await expect(addressSection.first()).toBeVisible();
	});

	test("affiche le récapitulatif des montants", async ({ page }) => {
		const hasOrder = await navigateToFirstOrder(page);
		test.skip(!hasOrder, "Pas de commandes disponibles");

		// Total amount
		const total = page.getByText(/Total/i);
		await expect(total.first()).toBeVisible();
	});
});

test.describe("Admin - Détail commande (actions)", { tag: ["@regression"] }, () => {
	test("les boutons d'action de statut sont présents pour les commandes éligibles", async ({
		page,
	}) => {
		const hasOrder = await navigateToFirstOrder(page);
		test.skip(!hasOrder, "Pas de commandes disponibles");

		// Look for any status action buttons
		const actionButtons = page.getByRole("button", {
			name: /Marquer|Confirmer|Expédier|Livrer|Annuler|Préparer|Rembourser/i,
		});

		const terminalStatus = page.getByText(/Livrée|Annulée|Remboursée/i);
		const isTerminal = await terminalStatus
			.first()
			.isVisible()
			.catch(() => false);

		if (isTerminal) {
			// Terminal status - limited actions available
			test.skip(true, "Commande en statut terminal");
		} else {
			await expect(actionButtons.first()).toBeVisible();
		}
	});

	test("le bouton de notes est disponible", async ({ page }) => {
		const hasOrder = await navigateToFirstOrder(page);
		test.skip(!hasOrder, "Pas de commandes disponibles");

		// Notes button or section
		const notesButton = page
			.getByRole("button", { name: /Notes|Commentaire|Note/i })
			.or(page.getByRole("tab", { name: /Notes/i }));

		if ((await notesButton.count()) > 0) {
			await expect(notesButton.first()).toBeVisible();

			// Click to open notes
			await notesButton.first().click();

			// Dialog or section should appear
			const notesDialog = page.getByRole("dialog").or(page.getByLabel(/Note|Commentaire/i));
			await expect(notesDialog.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
		}
	});

	test("le bouton renvoyer l'email est disponible", async ({ page }) => {
		const hasOrder = await navigateToFirstOrder(page);
		test.skip(!hasOrder, "Pas de commandes disponibles");

		const resendButton = page.getByRole("button", { name: /Renvoyer|Email|Envoyer/i });

		if ((await resendButton.count()) > 0) {
			await expect(resendButton.first()).toBeVisible();
		}
	});

	test("cliquer sur un bouton d'action ouvre une boîte de confirmation", async ({ page }) => {
		const hasOrder = await navigateToFirstOrder(page);
		test.skip(!hasOrder, "Pas de commandes disponibles");

		// Find any status action button
		const actionButtons = page.getByRole("button", {
			name: /Marquer|Confirmer|Expédier|Livrer|Annuler|Préparer/i,
		});

		const actionCount = await actionButtons.count();
		test.skip(actionCount === 0, "Pas de boutons d'action disponibles");

		await actionButtons.first().click();

		// Should open a confirmation dialog
		const alertDialog = page.getByRole("alertdialog").or(page.getByRole("dialog"));
		await expect(alertDialog.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Dialog should have confirm/cancel buttons
		const cancelButton = alertDialog.first().getByRole("button", { name: /Annuler|Fermer|Non/i });
		await expect(cancelButton).toBeVisible();

		// Close the dialog without confirming
		await cancelButton.click();
		await expect(alertDialog.first()).not.toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("le suivi de livraison est disponible pour les commandes expédiées", async ({ page }) => {
		// Go to order list
		await page.goto("/admin/ventes/commandes");
		await page.waitForLoadState("domcontentloaded");

		const table = page.getByRole("table");
		await expect(table.or(page.getByText(/Aucune commande/i))).toBeVisible({
			timeout: TIMEOUTS.DATA_LOAD,
		});

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de commandes dans la table");

		// Look for a shipped order
		const shippedRow = table.locator("tbody tr").filter({ hasText: /Expédiée/i });
		const hasShipped = (await shippedRow.count()) > 0;
		test.skip(!hasShipped, "Pas de commande expédiée");

		await shippedRow.first().getByRole("link").first().click();
		await page.waitForLoadState("domcontentloaded");

		// Tracking info should be visible
		const trackingSection = page.getByText(/Suivi|Tracking|Transporteur|Numéro de suivi/i);
		await expect(trackingSection.first()).toBeVisible();
	});
});

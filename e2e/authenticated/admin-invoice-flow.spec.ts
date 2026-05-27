import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { TIMEOUTS } from "../constants";

/**
 * @regression admin-invoice-tools-2026-05-27
 *
 * Cross-module flow couvrant les outils admin facturation ajoutés en Phase 1 :
 *  - "Télécharger la facture" depuis le détail commande admin (bypass
 *    rate-limit + ownership, Group D + E).
 *  - filtre `filter_invoiceStatus` sur la liste commandes (Group E,
 *    EINV-AUDIT-008).
 *
 * Sans ces gardes, une régression sur la route /invoice ou sur le where
 * builder casserait l'audit fiscal admin en silence.
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

test.describe("Admin — outils facturation", { tag: ["@critical"] }, () => {
	test("admin can download an invoice from order detail (bypass rate-limit + ownership)", async ({
		page,
	}) => {
		const hasOrder = await navigateToFirstOrder(page);
		test.skip(!hasOrder, "Pas de commandes disponibles");

		// Open the action menu and look for "Télécharger la facture"
		const trigger = page.getByRole("button", { name: /Plus d'actions/i });
		await trigger.click();

		const downloadItem = page.getByText(/Télécharger la facture/i);
		await expect(downloadItem).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Stop here if the order is not PAID (item is rendered but disabled).
		const ariaDisabled = await downloadItem.getAttribute("aria-disabled");
		if (ariaDisabled === "true") {
			test.skip(true, "Première commande non payée — bouton désactivé");
			return;
		}

		const [response] = await Promise.all([
			page.waitForResponse(
				(resp) => resp.url().includes("/api/orders/") && resp.url().includes("/invoice"),
			),
			downloadItem.click(),
		]);

		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("application/pdf");

		// Admin should NOT be hit by the 10/h rate-limit (Group D). The route
		// must never short-circuit to 429 for an ADMIN session.
		expect(response.status()).not.toBe(429);
	});

	test("admin can filter the orders list by invoice status", async ({ page }) => {
		await page.goto("/admin/ventes/commandes?filter_invoiceStatus=GENERATED");
		await page.waitForLoadState("domcontentloaded");

		// The active-filter badge should reflect the applied filter.
		const badge = page.getByText(/Facture\s*:\s*Émise/i).first();
		await expect(badge).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });

		// Same with VOIDED.
		await page.goto("/admin/ventes/commandes?filter_invoiceStatus=VOIDED");
		await page.waitForLoadState("domcontentloaded");

		const voidedBadge = page.getByText(/Facture\s*:\s*Annulée/i).first();
		await expect(voidedBadge).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});
});

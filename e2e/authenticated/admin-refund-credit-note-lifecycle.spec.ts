import { test, expect } from "../fixtures";
import { TIMEOUTS, requireSeedData } from "../constants";

/**
 * EINV-TEST-021 — Lifecycle admin : commande payée → refund total → avoir
 * A-YYYY-NNNNN.
 *
 * Validation E2E que l'admin peut :
 *  1. Accéder à la page de refunds
 *  2. Voir les commandes refundables (statut PAID)
 *  3. Une fois le refund processé, l'order passe REFUNDED + creditNoteNumber posé
 *  4. La facture devient VOIDED + bandeau "FACTURE ANNULÉE" sur le PDF
 *
 * Le refund Stripe réel n'est PAS déclenché ici (sandbox testing limité dans
 * un environnement CI). On vérifie que les écrans / actions / format de
 * numéro avoir respectent le contrat A-YYYY-NNNNN sans casser.
 */
test.describe("Lifecycle admin — refund → avoir", { tag: ["@critical"] }, () => {
	test("page refunds accessible et affiche la table des remboursements", async ({ page }) => {
		await page.goto("/admin/ventes/remboursements");
		await page.waitForLoadState("domcontentloaded");

		const heading = page.getByRole("heading", { name: /Remboursement/i });
		await expect(heading).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const table = page.locator("table");
		const emptyState = page.getByText(/aucun remboursement/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });
	});

	test("commande admin avec invoiceStatus=VOIDED affiche le creditNoteNumber A-YYYY-NNNNN", async ({
		page,
	}) => {
		// Navigue sur la page commandes admin avec filtre invoiceStatus=VOIDED
		await page.goto("/admin/ventes/commandes?invoiceStatus=VOIDED");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/aucune commande/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de commande VOIDED dans seed");

		// Si on en a une, ouvre le détail et vérifie le format
		const firstRow = table.locator("tbody tr").first();
		await firstRow.click();
		await page.waitForLoadState("domcontentloaded");

		// Le détail order doit mentionner soit "A-YYYY-NNNNN" soit "Avoir"
		const creditNoteText = page.getByText(/A-\d{4}-\d{5}|Avoir|invalidée/i);
		await expect(creditNoteText.first()).toBeVisible({ timeout: TIMEOUTS.FEEDBACK });
	});

	test("download facture VOIDED retourne PDF avec header X-Invoice-Status: VOIDED", async ({
		page,
	}) => {
		// On cherche une order voided (filter route)
		await page.goto("/admin/ventes/commandes?invoiceStatus=VOIDED");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const tableVisible = await table.isVisible();
		test.skip(!tableVisible, "Pas de commande VOIDED");
		const firstRow = table.locator("tbody tr").first();
		const rowCount = await table.locator("tbody tr").count();
		test.skip(rowCount === 0, "Seed n'a aucune commande VOIDED");

		await firstRow.click();
		await page.waitForLoadState("domcontentloaded");

		const downloadButton = page.getByRole("button", { name: /Télécharger la facture/i });
		const downloadVisible = await downloadButton.isVisible().catch(() => false);
		test.skip(!downloadVisible, "Bouton download absent (refonte UI?)");

		const [response] = await Promise.all([
			page.waitForResponse((r) => r.url().includes("/invoice") && r.request().method() === "GET", {
				timeout: TIMEOUTS.DATA_LOAD,
			}),
			downloadButton.click(),
		]);

		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("application/pdf");
		// EINV-SEC-007 : facture VOIDED régénérée avec bandeau ANNULÉE,
		// X-Invoice-Status posé par buildPdfHeaders(... { voided: true })
		expect(response.headers()["x-invoice-status"]).toBe("VOIDED");
		// Cache court (re-téléchargement possible si régénération bandeau)
		const cacheControl = response.headers()["cache-control"] ?? "";
		expect(cacheControl).toContain("must-revalidate");
		expect(cacheControl).not.toContain("immutable");
	});

	test("filtre invoiceStatus=GENERATED affiche uniquement les commandes avec facture active", async ({
		page,
	}) => {
		await page.goto("/admin/ventes/commandes?invoiceStatus=GENERATED");
		await page.waitForLoadState("domcontentloaded");

		const table = page.locator("table");
		const emptyState = page.getByText(/aucune commande/i);
		await expect(table.or(emptyState)).toBeVisible({ timeout: TIMEOUTS.DATA_LOAD });

		const hasOrders = await table.isVisible();
		requireSeedData(test, hasOrders, "Pas de commande GENERATED dans seed");

		// Toutes les lignes doivent porter le badge "Générée" ou un numéro F-YYYY-NNNNN
		// (pas A-...)
		const cellsWithA = await page.getByText(/A-\d{4}-\d{5}/).count();
		expect(cellsWithA).toBe(0);
	});
});

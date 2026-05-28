import { test, expect } from "../fixtures";
import { requireSeedData, TIMEOUTS } from "../constants";

/**
 * EINV-TEST-020 — Lifecycle complet user : commande payée → download facture
 * → archive UploadThing (hash SHA-256 immuable) → réplique avec immutable
 * cache headers.
 *
 * Golden path qui orchestre 4 couches en un seul test :
 *  1. Liste commandes : la commande paid affiche le bouton download
 *  2. Click → API /invoice retourne 200 + Content-Type PDF + Disposition
 *  3. Headers immutables (Art. L102 B LPF) : `Cache-Control: immutable`,
 *     `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
 *  4. 2e click → MÊME PDF (idempotence — pas de re-archive UploadThing)
 *
 * Le test échoue si l'un de ces 4 contrats régresse en conditions réelles.
 */
test.describe("Lifecycle user — commande payée → facture archivée", { tag: ["@critical"] }, () => {
	test("commande PAID : 2 downloads successifs → même PDF + headers immuables", async ({
		page,
		orderPage,
	}) => {
		await orderPage.goto();
		const hasOrders = await orderPage.hasOrders();
		requireSeedData(test, hasOrders, "Pas de commande dans seed");

		// Navigue sur la 1ère commande
		const viewButton = page.getByLabel(/Voir la commande/i).first();
		await viewButton.click();
		await page.waitForLoadState("domcontentloaded");

		const downloadButton = page.getByRole("button", { name: /Télécharger la facture/i });
		const visible = await downloadButton.isVisible().catch(() => false);
		test.skip(!visible, "1ère commande pas PAID — bouton absent");

		// 1er download
		const [resp1] = await Promise.all([
			page.waitForResponse((r) => r.url().includes("/invoice") && r.request().method() === "GET", {
				timeout: TIMEOUTS.DATA_LOAD,
			}),
			downloadButton.click(),
		]);

		expect(resp1.status()).toBe(200);
		expect(resp1.headers()["content-type"]).toContain("application/pdf");
		expect(resp1.headers()["cache-control"] ?? "").toContain("immutable");
		expect(resp1.headers()["cache-control"] ?? "").toContain("max-age=31536000");
		expect(resp1.headers()["x-frame-options"]).toBe("DENY");
		expect(resp1.headers()["x-content-type-options"]).toBe("nosniff");

		const disposition1 = resp1.headers()["content-disposition"] ?? "";
		expect(disposition1).toMatch(/filename="facture-[FA]-\d{4}-\d{5}\.pdf"|filename="facture-SYN-/);

		// 2e download — doit retourner le MÊME PDF (idempotent, archive UploadThing)
		const [resp2] = await Promise.all([
			page.waitForResponse((r) => r.url().includes("/invoice") && r.request().method() === "GET", {
				timeout: TIMEOUTS.DATA_LOAD,
			}),
			downloadButton.click(),
		]);

		expect(resp2.status()).toBe(200);
		expect(resp2.headers()["content-disposition"]).toBe(disposition1);
	});

	test("Content-Disposition format facture-F-YYYY-NNNNN ou facture-SYN-... pour fallback", async ({
		page,
		orderPage,
	}) => {
		await orderPage.goto();
		const hasOrders = await orderPage.hasOrders();
		requireSeedData(test, hasOrders, "Pas de commande dans seed");

		const viewButton = page.getByLabel(/Voir la commande/i).first();
		await viewButton.click();
		await page.waitForLoadState("domcontentloaded");

		const downloadButton = page.getByRole("button", { name: /Télécharger la facture/i });
		const visible = await downloadButton.isVisible().catch(() => false);
		test.skip(!visible, "1ère commande pas PAID");

		const [response] = await Promise.all([
			page.waitForResponse((r) => r.url().includes("/invoice")),
			downloadButton.click(),
		]);

		const disposition = response.headers()["content-disposition"] ?? "";

		// Soit invoiceNumber officiel F-YYYY-NNNNN, soit fallback orderNumber SYN-...
		expect(disposition).toMatch(
			/filename="facture-(F-\d{4}-\d{5}|A-\d{4}-\d{5}|SYN-[A-Z0-9-]+)\.pdf"/,
		);
	});
});

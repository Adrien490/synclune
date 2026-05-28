import { test, expect } from "../fixtures";
import { requireSeedData } from "../constants";

/**
 * EINV-TEST-012 — Security E2E : userA ne peut pas lire la facture de userB.
 *
 * RGPD ownership : la route `/api/orders/[orderNumber]/invoice` doit retourner
 * 403 quand un user authentifié tente d'accéder à une commande appartenant à
 * un autre user (et sans token signé valide).
 *
 * Couvert en unit test (route.test.ts:168 "returns 403 when order belongs to
 * a different user") mais ce E2E valide qu'aucune couche middleware / CDN /
 * ISR ne contourne la vérif ownership en conditions réelles.
 *
 * Pré-requis : storageState authentifié (Playwright project `authenticated-user`).
 * Le test tente d'accéder à un orderNumber qui N'EXISTE PAS dans la base du user :
 * la route doit renvoyer 403 ou 404 — JAMAIS 200 PDF.
 */
test.describe("Cross-user invoice access (security)", { tag: ["@critical"] }, () => {
	test("user authentifié reçoit 403/404 sur orderNumber d'un autre user", async ({ page }) => {
		// On utilise un orderNumber arbitraire qui n'appartient probablement pas
		// au user du storageState. Même si la commande existe, la route doit
		// vérifier `order.userId === session.user.id` et refuser sinon.
		const fakeOrderNumber = "SYN-OTHER-USER-2026-99999";

		const response = await page.request.get(`/api/orders/${fakeOrderNumber}/invoice`);

		// 200 = FUITE de données critique. 403 = ownership refusé. 404 = order
		// inexistant. Les deux sont acceptables — le contrat est "JAMAIS 200
		// sans ownership ou token signé valide".
		expect(response.status()).not.toBe(200);
		expect([403, 404]).toContain(response.status());

		// Si 403 : la réponse doit être un message texte, pas un PDF.
		if (response.status() === 403) {
			const contentType = response.headers()["content-type"] ?? "";
			expect(contentType).not.toContain("application/pdf");
		}
	});

	test("token query invalide → 403/404 (HMAC vérifie pas)", async ({ page }) => {
		const response = await page.request.get(
			"/api/orders/SYN-CROSS-USER-TEST/invoice?token=tampered.signature.invalid",
		);

		expect(response.status()).not.toBe(200);
		expect([403, 404]).toContain(response.status());
	});

	test("user authentifié sur son PROPRE order paid → 200 (contrôle positif)", async ({
		page,
		orderPage,
	}) => {
		await orderPage.goto();
		const hasOrders = await orderPage.hasOrders();
		requireSeedData(test, hasOrders, "No orders for control test");

		const viewButton = page.getByLabel(/Voir la commande/i).first();
		await viewButton.click();
		await page.waitForLoadState("domcontentloaded");

		const downloadButton = page.getByRole("button", { name: /Télécharger la facture/i });
		const visible = await downloadButton.isVisible().catch(() => false);
		test.skip(!visible, "First listed order not PAID — no invoice button");

		const [response] = await Promise.all([
			page.waitForResponse(
				(resp) => resp.url().includes("/invoice") && resp.request().method() === "GET",
			),
			downloadButton.click(),
		]);

		// Contrôle positif : on attend bien 200 sur son propre order
		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("application/pdf");
	});

	test("requête sans cookie session ET sans token → 401", async ({ browser }) => {
		// Nouveau contexte sans storageState : pas de session
		const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
		const page = await ctx.newPage();

		const response = await page.request.get("/api/orders/SYN-NO-AUTH/invoice");

		expect(response.status()).toBe(401);

		await ctx.close();
	});
});

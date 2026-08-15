import { test, expect } from "./fixtures";

test.describe("API Routes - Endpoints publics", { tag: ["@regression"] }, () => {
	test("GET /api/health retourne 200 avec status ok", async ({ page }) => {
		const response = await page.request.get("/api/health");

		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty("status", "ok");
	});

	test("POST /api/csp-report accepte un rapport CSP", async ({ page }) => {
		const response = await page.request.post("/api/csp-report", {
			data: {
				"csp-report": {
					"document-uri": "https://synclune.fr",
					"blocked-uri": "https://evil.com/script.js",
					"violated-directive": "script-src",
					"original-policy": "script-src 'self'",
				},
			},
			headers: {
				"Content-Type": "application/csp-report",
			},
		});

		// Should accept the report (200 or 204)
		expect(response.status()).toBeLessThan(300);
	});
});

test.describe("API Routes - Endpoints proteges (sans auth)", { tag: ["@regression"] }, () => {
	test("POST /api/admin/orders/export sans auth retourne 401 ou 403", async ({ page }) => {
		const response = await page.request.post("/api/admin/orders/export");

		// Should deny access
		expect([401, 403]).toContain(response.status());
	});

	test("POST /api/webhooks/stripe sans signature retourne une erreur", async ({ page }) => {
		const response = await page.request.post("/api/webhooks/stripe", {
			data: { type: "test" },
			headers: {
				"Content-Type": "application/json",
			},
		});

		// Should reject without valid Stripe signature
		expect(response.status()).toBeGreaterThanOrEqual(400);
	});
});

// NOTE: il n'existe pas de route `/api/search`. La recherche passe par une Server Action
// (`modules/products/actions/quick-search.ts` + `modules/products/data/quick-search-products.ts`).
// Les tests qui interrogeaient `/api/search` ont été retirés : ils visaient une route inexistante.

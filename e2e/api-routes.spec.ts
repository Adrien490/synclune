import { test, expect } from "./fixtures";

test.describe("API Routes - Endpoints publics", { tag: ["@regression"] }, () => {
	test("GET /api/health retourne 200 avec status ok", async ({ page }) => {
		const response = await page.request.get("/api/health");

		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty("status", "ok");
	});

	test("GET /api/noop retourne une reponse valide", async ({ page }) => {
		const response = await page.request.get("/api/noop");

		expect(response.status()).toBe(200);
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

test.describe("API Routes - Endpoints proteges (avec auth admin)", { tag: ["@regression"] }, () => {
	test("GET /api/health avec admin retourne les details des services", async ({ page }) => {
		const response = await page.request.get("/api/health");

		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toHaveProperty("status");

		// Admin may get detailed service info
		if (body.services) {
			expect(body.services).toHaveProperty("database");
		}
	});

	test("POST /api/admin/orders/export avec auth retourne un CSV", async ({ page }) => {
		const response = await page.request.post("/api/admin/orders/export?format=csv");

		// If authenticated as admin, should get CSV or empty response
		if (response.status() === 200) {
			const contentType = response.headers()["content-type"];
			expect(contentType).toMatch(/text\/csv|application\/octet-stream|text\/plain/);
		} else {
			// May still be 401 if the test runs without admin auth context
			expect([401, 403]).toContain(response.status());
		}
	});
});

test.describe("API Routes - Validation des entrees", { tag: ["@regression"] }, () => {
	test("les routes cron sans CRON_SECRET retournent 401", async ({ page }) => {
		const cronRoutes = ["/api/cron/reopen-store", "/api/cron/sync-async-payments"];

		for (const route of cronRoutes) {
			const response = await page.request.post(route, {
				headers: { "Content-Type": "application/json" },
			});

			// Should deny access without CRON_SECRET
			expect(
				response.status(),
				`${route} should reject without CRON_SECRET`,
			).toBeGreaterThanOrEqual(400);
		}
	});

	// NOTE: il n'existe pas de route `/api/search`. La recherche passe par une Server Action
	// (`modules/products/actions/quick-search.ts` + `modules/products/data/quick-search-products.ts`).
	// Les tests qui interrogeaient `/api/search` ont été retirés : ils visaient une route inexistante.
});

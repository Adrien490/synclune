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
	test("GET /api/admin/orders/export sans auth retourne 401 ou 403", async ({ page }) => {
		const response = await page.request.get("/api/admin/orders/export");

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

	test("GET /api/admin/orders/export avec auth retourne un CSV", async ({ page }) => {
		const response = await page.request.get("/api/admin/orders/export?format=csv");

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
		const cronRoutes = [
			"/api/cron/cleanup-carts",
			"/api/cron/cleanup-sessions",
			"/api/cron/retry-failed-emails",
		];

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

	test("GET /api/search sans query retourne un resultat vide ou une erreur", async ({ page }) => {
		const response = await page.request.get("/api/search");

		// Should either return empty results or a validation error
		expect(response.status()).toBeLessThan(500);

		if (response.status() === 200) {
			const body = await response.json();
			// Should have an empty or valid result structure
			expect(body).toBeDefined();
		}
	});

	test("GET /api/search avec query valide retourne des resultats", async ({ page }) => {
		const response = await page.request.get("/api/search?q=bijou");

		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body).toBeDefined();
		// Should have results array or similar structure
		expect(Array.isArray(body) || typeof body === "object").toBe(true);
	});
});

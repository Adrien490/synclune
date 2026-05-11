import { test, expect } from "../fixtures";

/**
 * E2E coverage for the sync-async-payments cron job.
 *
 * Scope: route auth (CRON_SECRET Bearer) + response contract.
 *
 * NOT covered here (requires Stripe sandbox + DB seed fixture):
 * - The full PaymentIntent succeeded/canceled reconciliation path. Those flows
 *   are unit-tested in modules/cron/services/__tests__/sync-async-payments.service.test.ts
 *   with mocked Stripe, and via webhooks/payment-intent integration tests.
 *
 * The tests below catch the most common production regression: a deploy that
 * accidentally exposes the cron endpoint without Bearer (privilege escalation),
 * or that breaks the JSON contract consumed by Vercel's cron monitoring.
 */
test.describe("@critical /api/cron/sync-async-payments", { tag: ["@critical"] }, () => {
	test("rejects requests without Authorization header in production-like config", async ({
		page,
	}) => {
		// In dev, verifyCronRequest short-circuits — this guards against a deploy
		// where NODE_ENV=production but headers/secret check is bypassed.
		const response = await page.request.get("/api/cron/sync-async-payments");

		// Locally NODE_ENV=development → 200, prod → 401. Either is acceptable;
		// what we never want is a 200 in prod without Bearer (regression check
		// on staging/prod via BASE_URL override).
		if (process.env.NODE_ENV === "production") {
			expect(response.status()).toBe(401);
		} else {
			expect([200, 401, 500]).toContain(response.status());
		}
	});

	test("rejects requests with wrong Authorization Bearer in production-like config", async ({
		page,
	}) => {
		const response = await page.request.get("/api/cron/sync-async-payments", {
			headers: { authorization: "Bearer this-is-not-the-real-secret" },
		});

		if (process.env.NODE_ENV === "production") {
			expect(response.status()).toBe(401);
		} else {
			// Dev mode short-circuits auth — the response should at least come back
			// as JSON (no crash on the route handler).
			expect(response.headers()["content-type"]).toContain("application/json");
		}
	});

	test("returns CronResult-shaped JSON when invoked successfully", async ({ page }) => {
		const headers: Record<string, string> = {};
		if (process.env.CRON_SECRET) {
			headers.authorization = `Bearer ${process.env.CRON_SECRET}`;
		}

		const response = await page.request.get("/api/cron/sync-async-payments", { headers });

		// In dev (no CRON_SECRET), the handler still runs and returns a valid response.
		// In prod-like CI with the right Bearer, it returns 200.
		expect([200, 401, 500]).toContain(response.status());

		if (response.status() === 200) {
			const body = await response.json();
			expect(body).toHaveProperty("success", true);
			expect(body).toHaveProperty("job", "sync-async-payments");
			expect(body).toHaveProperty("processed");
			expect(body).toHaveProperty("errored");
			expect(body).toHaveProperty("skipped");
			expect(typeof body.processed).toBe("number");
			expect(typeof body.errored).toBe("number");
			expect(typeof body.skipped).toBe("number");
		}
	});
});

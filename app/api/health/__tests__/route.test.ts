import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockQueryRaw, mockStripeBalance, mockRequireAdminApiRoute } = vi.hoisted(() => ({
	mockQueryRaw: vi.fn(),
	mockStripeBalance: vi.fn(),
	mockRequireAdminApiRoute: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		$queryRaw: mockQueryRaw,
	},
}));

vi.mock("@/shared/lib/circuit-breaker", () => ({
	stripeCircuitBreaker: {
		get isAvailable() {
			return true;
		},
		get state() {
			return "CLOSED";
		},
	},
	resendCircuitBreaker: {
		get isAvailable() {
			return true;
		},
		get state() {
			return "CLOSED";
		},
	},
}));

vi.mock("stripe", () => ({
	default: class MockStripe {
		balance = { retrieve: mockStripeBalance };
		constructor() {}
	},
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminApiRoute: mockRequireAdminApiRoute,
}));

import { GET } from "../route";

// ============================================================================
// Tests: GET /api/health
// ============================================================================

describe("GET /api/health", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
		vi.stubEnv("RESEND_API_KEY", "re_test_123");
	});

	describe("unauthenticated request", () => {
		it("returns minimal status only", async () => {
			mockRequireAdminApiRoute.mockResolvedValue({
				response: new Response("Unauthorized", { status: 401 }),
			});

			const response = await GET();

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body).toEqual({ status: "ok" });
			expect(body.services).toBeUndefined();
			expect(body.version).toBeUndefined();
		});
	});

	describe("admin - all services healthy", () => {
		beforeEach(() => {
			mockRequireAdminApiRoute.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
		});

		it("returns 200 with status ok when all services are reachable", async () => {
			mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
			mockStripeBalance.mockResolvedValue({ available: [] });

			const response = await GET();

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.status).toBe("ok");
			expect(body.services.database.status).toBe("ok");
			expect(body.services.stripe.status).toBe("ok");
			expect(body.services.resend.status).toBe("ok");
			expect(body.timestamp).toBeDefined();
		});

		it("includes latency measurements for database and stripe", async () => {
			mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
			mockStripeBalance.mockResolvedValue({ available: [] });

			const response = await GET();
			const body = await response.json();

			expect(typeof body.services.database.latencyMs).toBe("number");
			expect(typeof body.services.stripe.latencyMs).toBe("number");
		});
	});

	describe("admin - database down", () => {
		beforeEach(() => {
			mockRequireAdminApiRoute.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
		});

		it("returns 503 when database is unreachable", async () => {
			mockQueryRaw.mockRejectedValue(new Error("Connection refused"));
			mockStripeBalance.mockResolvedValue({ available: [] });

			const response = await GET();

			expect(response.status).toBe(503);
			const body = await response.json();
			expect(body.status).toBe("error");
			expect(body.services.database.status).toBe("error");
			expect(body.services.database.message).toContain("Connection refused");
		});
	});

	describe("admin - stripe down", () => {
		beforeEach(() => {
			mockRequireAdminApiRoute.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
		});

		it("returns 503 when Stripe is unreachable", async () => {
			mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
			mockStripeBalance.mockRejectedValue(new Error("Stripe timeout"));

			const response = await GET();

			expect(response.status).toBe(503);
			const body = await response.json();
			expect(body.status).toBe("error");
			expect(body.services.stripe.status).toBe("error");
		});
	});
});

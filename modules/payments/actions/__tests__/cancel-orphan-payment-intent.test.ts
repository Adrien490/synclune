import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockStripePaymentIntentsCancel,
	mockStripePaymentIntentsRetrieve,
	mockWithStripeCircuitBreaker,
	mockLoggerInfo,
	mockGetSession,
	mockGetOrCreateCartSessionId,
	mockCheckRateLimit,
	mockGetClientIp,
	mockGetRateLimitIdentifier,
	mockHeaders,
} = vi.hoisted(() => ({
	mockStripePaymentIntentsCancel: vi.fn(),
	mockStripePaymentIntentsRetrieve: vi.fn(),
	mockWithStripeCircuitBreaker: vi.fn((fn: () => Promise<unknown>) => fn()),
	mockLoggerInfo: vi.fn(),
	mockGetSession: vi.fn(),
	mockGetOrCreateCartSessionId: vi.fn(),
	mockCheckRateLimit: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockGetRateLimitIdentifier: vi.fn(),
	mockHeaders: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("server-only", () => ({}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: {
		paymentIntents: {
			cancel: mockStripePaymentIntentsCancel,
			retrieve: mockStripePaymentIntentsRetrieve,
		},
	},
	withStripeCircuitBreaker: mockWithStripeCircuitBreaker,
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/modules/cart/lib/cart-session", () => ({
	getOrCreateCartSessionId: mockGetOrCreateCartSessionId,
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
	getRateLimitIdentifier: mockGetRateLimitIdentifier,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	PAYMENT_LIMITS: { CANCEL_ORPHAN: "cancel-orphan" },
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		info: mockLoggerInfo,
	},
}));

import { cancelOrphanPaymentIntent } from "../cancel-orphan-payment-intent";

// ============================================================================
// TESTS
// ============================================================================

const AUTH_PI = {
	id: "pi_test_abc123",
	status: "requires_payment_method",
	metadata: { userId: "user-123" },
};

describe("cancelOrphanPaymentIntent", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockWithStripeCircuitBreaker.mockImplementation((fn: () => Promise<unknown>) => fn());
		// Default: authenticated owner of AUTH_PI, rate limit OK.
		mockGetSession.mockResolvedValue({ user: { id: "user-123" } });
		mockGetOrCreateCartSessionId.mockResolvedValue(null);
		mockHeaders.mockResolvedValue(new Map());
		mockGetClientIp.mockResolvedValue("1.2.3.4");
		mockGetRateLimitIdentifier.mockReturnValue("guest:rl");
		mockCheckRateLimit.mockResolvedValue({ success: true });
		mockStripePaymentIntentsRetrieve.mockResolvedValue(AUTH_PI);
		mockStripePaymentIntentsCancel.mockResolvedValue({ id: AUTH_PI.id, status: "canceled" });
	});

	// ─── Early return for invalid IDs ─────────────────────────────────────────

	it("returns early without touching Stripe for ID not starting with 'pi_'", async () => {
		await cancelOrphanPaymentIntent("ch_test_abc123");

		expect(mockGetSession).not.toHaveBeenCalled();
		expect(mockStripePaymentIntentsRetrieve).not.toHaveBeenCalled();
		expect(mockStripePaymentIntentsCancel).not.toHaveBeenCalled();
	});

	it("returns early without touching Stripe for empty string", async () => {
		await cancelOrphanPaymentIntent("");

		expect(mockStripePaymentIntentsRetrieve).not.toHaveBeenCalled();
		expect(mockStripePaymentIntentsCancel).not.toHaveBeenCalled();
	});

	// ─── Ownership enforcement (audit P2.3 — IDOR) ────────────────────────────

	it("cancels when the authenticated user owns the PI (metadata.userId match)", async () => {
		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockStripePaymentIntentsRetrieve).toHaveBeenCalledWith("pi_test_abc123");
		expect(mockStripePaymentIntentsCancel).toHaveBeenCalledWith("pi_test_abc123");
	});

	it("cancels when the guest session owns the PI (metadata.guestSessionId match)", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetOrCreateCartSessionId.mockResolvedValue("sess-guest-1");
		mockStripePaymentIntentsRetrieve.mockResolvedValue({
			id: "pi_test_abc123",
			metadata: { userId: "guest", guestSessionId: "sess-guest-1" },
		});

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockStripePaymentIntentsCancel).toHaveBeenCalledWith("pi_test_abc123");
	});

	it("does NOT cancel a PI owned by another user (ownership mismatch)", async () => {
		mockStripePaymentIntentsRetrieve.mockResolvedValue({
			id: "pi_test_abc123",
			metadata: { userId: "someone-else" },
		});

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockStripePaymentIntentsRetrieve).toHaveBeenCalled();
		expect(mockStripePaymentIntentsCancel).not.toHaveBeenCalled();
	});

	it("does NOT cancel a guest PI when the session id differs", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetOrCreateCartSessionId.mockResolvedValue("sess-A");
		mockStripePaymentIntentsRetrieve.mockResolvedValue({
			id: "pi_test_abc123",
			metadata: { userId: "guest", guestSessionId: "sess-B" },
		});

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockStripePaymentIntentsCancel).not.toHaveBeenCalled();
	});

	it("does NOT cancel a PI already bound to an order (metadata.orderId set)", async () => {
		mockStripePaymentIntentsRetrieve.mockResolvedValue({
			id: "pi_test_abc123",
			metadata: { userId: "user-123", orderId: "order-1" },
		});

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockStripePaymentIntentsCancel).not.toHaveBeenCalled();
	});

	// ─── Rate limit / session guards ──────────────────────────────────────────

	it("returns early without retrieving the PI when rate-limited", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: false });

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockStripePaymentIntentsRetrieve).not.toHaveBeenCalled();
		expect(mockStripePaymentIntentsCancel).not.toHaveBeenCalled();
	});

	it("returns early when there is no user and no session id", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetOrCreateCartSessionId.mockResolvedValue(null);

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockCheckRateLimit).not.toHaveBeenCalled();
		expect(mockStripePaymentIntentsRetrieve).not.toHaveBeenCalled();
	});

	// ─── Error handling (fire-and-forget) ─────────────────────────────────────

	it("catches Stripe errors and logs them without re-throwing", async () => {
		mockStripePaymentIntentsCancel.mockRejectedValue(new Error("already captured"));

		await expect(cancelOrphanPaymentIntent("pi_test_abc123")).resolves.toBeUndefined();
		expect(mockLoggerInfo).toHaveBeenCalledTimes(1);
		expect(mockLoggerInfo).toHaveBeenCalledWith(
			"Could not cancel orphan PI (may already be captured/canceled)",
			{ service: "checkout", paymentIntentId: "pi_test_abc123" },
		);
	});

	it("does not log when cancel succeeds for an owned PI", async () => {
		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockLoggerInfo).not.toHaveBeenCalled();
	});
});

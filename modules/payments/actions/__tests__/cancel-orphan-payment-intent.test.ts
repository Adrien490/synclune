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
	mockGetOrCreateGuestSessionId,
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
	mockGetOrCreateGuestSessionId: vi.fn(),
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

vi.mock("@/modules/cart/lib/guest-session", () => ({
	getOrCreateGuestSessionId: mockGetOrCreateGuestSessionId,
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

// IDs au format réel : userId = cuid (Prisma @default(cuid())), guestSessionId = UUID v4.
// Le parse Zod de la metadata (stripe-metadata.schema) droppe tout format invalide.
const USER_ID = "cm3x7k2ab0002qz8v6f1k8c2d";
const OTHER_USER_ID = "cm3x7k2ab0009qz8v1a2b3c4d";
const GUEST_SESSION_A = "550e8400-e29b-41d4-a716-446655440000";
const GUEST_SESSION_B = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";

const AUTH_PI = {
	id: "pi_test_abc123",
	status: "requires_payment_method",
	metadata: { userId: USER_ID },
};

describe("cancelOrphanPaymentIntent", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockWithStripeCircuitBreaker.mockImplementation((fn: () => Promise<unknown>) => fn());
		// Default: authenticated owner of AUTH_PI, rate limit OK.
		mockGetSession.mockResolvedValue({ user: { id: USER_ID } });
		mockGetOrCreateGuestSessionId.mockResolvedValue(null);
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
		mockGetOrCreateGuestSessionId.mockResolvedValue(GUEST_SESSION_A);
		mockStripePaymentIntentsRetrieve.mockResolvedValue({
			id: "pi_test_abc123",
			metadata: { userId: "guest", guestSessionId: GUEST_SESSION_A },
		});

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockStripePaymentIntentsCancel).toHaveBeenCalledWith("pi_test_abc123");
	});

	it("does NOT cancel a PI owned by another user (ownership mismatch)", async () => {
		mockStripePaymentIntentsRetrieve.mockResolvedValue({
			id: "pi_test_abc123",
			metadata: { userId: OTHER_USER_ID },
		});

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockStripePaymentIntentsRetrieve).toHaveBeenCalled();
		expect(mockStripePaymentIntentsCancel).not.toHaveBeenCalled();
	});

	it("does NOT cancel a guest PI when the session id differs", async () => {
		mockGetSession.mockResolvedValue(null);
		mockGetOrCreateGuestSessionId.mockResolvedValue(GUEST_SESSION_A);
		mockStripePaymentIntentsRetrieve.mockResolvedValue({
			id: "pi_test_abc123",
			metadata: { userId: "guest", guestSessionId: GUEST_SESSION_B },
		});

		await cancelOrphanPaymentIntent("pi_test_abc123");

		expect(mockStripePaymentIntentsCancel).not.toHaveBeenCalled();
	});

	it("does NOT cancel a PI already bound to an order (metadata.orderId set)", async () => {
		mockStripePaymentIntentsRetrieve.mockResolvedValue({
			id: "pi_test_abc123",
			metadata: { userId: USER_ID, orderId: "order-1" },
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
		mockGetOrCreateGuestSessionId.mockResolvedValue(null);

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

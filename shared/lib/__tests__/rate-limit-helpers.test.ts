import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// MOCK: @/shared/lib/rate-limit
// ============================================================================

const mockCheckRateLimit = vi.fn();

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
}));

// ============================================================================
// TESTS
// ============================================================================

describe("enforceRateLimit", () => {
	beforeEach(() => {
		mockCheckRateLimit.mockReset();
	});

	// --------------------------------------------------------------------------
	// 1. Success path
	// --------------------------------------------------------------------------

	it("returns { success: true } when checkRateLimit passes", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: true,
			remaining: 9,
			limit: 10,
			reset: Date.now() + 60000,
		});

		const { enforceRateLimit } = await import("@/shared/lib/actions/rate-limit");
		const result = await enforceRateLimit("user:abc", { limit: 10, windowMs: 60000 });

		expect(result).toEqual({ success: true });
	});

	// --------------------------------------------------------------------------
	// 2. Failure path - ActionState shape
	// --------------------------------------------------------------------------

	it("returns { error: ActionState } with ActionStatus.ERROR when rate limit is exceeded", async () => {
		const reset = Date.now() + 45000;
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			remaining: 0,
			limit: 5,
			reset,
			retryAfter: 45,
			error: "Trop de requêtes. Veuillez réessayer dans 45 secondes.",
		});

		const { enforceRateLimit } = await import("@/shared/lib/actions/rate-limit");
		const result = await enforceRateLimit("user:abc", { limit: 5, windowMs: 60000 });

		expect(result).toHaveProperty("error");

		const actionState = (result as { error: { status: ActionStatus; message: string; data?: unknown } }).error;

		expect(actionState.status).toBe(ActionStatus.ERROR);
		expect(actionState.message).toBe("Trop de requêtes. Veuillez réessayer dans 45 secondes.");
		expect(actionState.data).toEqual({ retryAfter: 45, reset });
	});

	it("uses the fallback message when checkRateLimit returns no error string", async () => {
		const reset = Date.now() + 30000;
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			remaining: 0,
			limit: 3,
			reset,
			retryAfter: 30,
			// error field intentionally absent
		});

		const { enforceRateLimit } = await import("@/shared/lib/actions/rate-limit");
		const result = await enforceRateLimit("session:sess-1", { limit: 3, windowMs: 60000 });

		expect(result).toHaveProperty("error");
		const actionState = (result as { error: { status: ActionStatus; message: string } }).error;

		expect(actionState.status).toBe(ActionStatus.ERROR);
		expect(actionState.message).toBe("Trop de requêtes. Veuillez réessayer plus tard.");
	});

	// --------------------------------------------------------------------------
	// 3. Arguments forwarding
	// --------------------------------------------------------------------------

	it("forwards identifier to checkRateLimit", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: true,
			remaining: 4,
			limit: 5,
			reset: Date.now() + 60000,
		});

		const { enforceRateLimit } = await import("@/shared/lib/actions/rate-limit");
		await enforceRateLimit("user:test-id", { limit: 5, windowMs: 30000 });

		expect(mockCheckRateLimit).toHaveBeenCalledWith(
			"user:test-id",
			{ limit: 5, windowMs: 30000 },
			undefined
		);
	});

	it("forwards config to checkRateLimit", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: true,
			remaining: 9,
			limit: 10,
			reset: Date.now() + 60000,
		});

		const config = { limit: 10, windowMs: 120000 };

		const { enforceRateLimit } = await import("@/shared/lib/actions/rate-limit");
		await enforceRateLimit("ip:1.2.3.4", config);

		expect(mockCheckRateLimit).toHaveBeenCalledWith("ip:1.2.3.4", config, undefined);
	});

	it("forwards ipAddress to checkRateLimit when provided", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: true,
			remaining: 7,
			limit: 10,
			reset: Date.now() + 60000,
		});

		const { enforceRateLimit } = await import("@/shared/lib/actions/rate-limit");
		await enforceRateLimit("user:u1", { limit: 10, windowMs: 60000 }, "5.5.5.5");

		expect(mockCheckRateLimit).toHaveBeenCalledWith(
			"user:u1",
			{ limit: 10, windowMs: 60000 },
			"5.5.5.5"
		);
	});

	it("forwards null ipAddress to checkRateLimit", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: true,
			remaining: 7,
			limit: 10,
			reset: Date.now() + 60000,
		});

		const { enforceRateLimit } = await import("@/shared/lib/actions/rate-limit");
		await enforceRateLimit("user:u2", { limit: 10, windowMs: 60000 }, null);

		expect(mockCheckRateLimit).toHaveBeenCalledWith(
			"user:u2",
			{ limit: 10, windowMs: 60000 },
			null
		);
	});
});

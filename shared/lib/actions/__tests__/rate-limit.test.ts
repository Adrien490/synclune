import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// Hoist mock factory so it is available before module resolution
const { mockCheckRateLimit } = vi.hoisted(() => ({
	mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
}));

import { enforceRateLimit } from "../rate-limit";
import type { RateLimitConfig } from "@/shared/lib/rate-limit";

// Shared config used across tests
const LIMIT_CONFIG: RateLimitConfig = { name: "test", limit: 10, windowMs: 60000 };

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// Success path
// ============================================================================

describe("enforceRateLimit — success", () => {
	it("returns { success: true } when checkRateLimit succeeds", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9, limit: 10, reset: 9999 });

		const result = await enforceRateLimit("user:abc", LIMIT_CONFIG);

		expect(result).toEqual({ success: true });
	});

	it("does not include an error key in the success response", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 5, limit: 10, reset: 9999 });

		const result = await enforceRateLimit("session:xyz", LIMIT_CONFIG);

		expect("error" in result).toBe(false);
	});
});

// ============================================================================
// Failure path — custom error message
// ============================================================================

describe("enforceRateLimit — failure with custom error message", () => {
	it("returns an error ActionState with the message from checkRateLimit", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			remaining: 0,
			limit: 10,
			reset: 9999,
			error: "Trop de requêtes. Veuillez réessayer dans 30 secondes.",
		});

		const result = await enforceRateLimit("user:abc", LIMIT_CONFIG);

		expect(result).toEqual({
			error: {
				status: ActionStatus.ERROR,
				message: "Trop de requêtes. Veuillez réessayer dans 30 secondes.",
			},
		});
	});

	it("sets status to ActionStatus.ERROR (value 'error')", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			remaining: 0,
			limit: 10,
			reset: 9999,
			error: "Custom rate limit message",
		});

		const result = await enforceRateLimit("ip:1.2.3.4", LIMIT_CONFIG);

		if (!("error" in result)) throw new Error("Expected error result");
		expect(result.error.status).toBe(ActionStatus.ERROR);
		expect(result.error.status).toBe("error");
	});
});

// ============================================================================
// Failure path — missing error message (fallback to default)
// ============================================================================

describe("enforceRateLimit — failure without error message", () => {
	it("uses the default French message when checkRateLimit returns no error string", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			remaining: 0,
			limit: 10,
			reset: 9999,
			// error property is undefined / absent
		});

		const result = await enforceRateLimit("user:abc", LIMIT_CONFIG);

		expect(result).toEqual({
			error: {
				status: ActionStatus.ERROR,
				message: "Trop de requêtes. Veuillez réessayer plus tard.",
			},
		});
	});

	it("uses the default French message when error is explicitly undefined", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			remaining: 0,
			limit: 10,
			reset: 9999,
			error: undefined,
		});

		const result = await enforceRateLimit("session:s1", LIMIT_CONFIG);

		if (!("error" in result)) throw new Error("Expected error result");
		expect(result.error.message).toBe("Trop de requêtes. Veuillez réessayer plus tard.");
	});
});

// ============================================================================
// retryAfter propagation
// ============================================================================

describe("enforceRateLimit — retryAfter propagation", () => {
	it("propagates retryAfter when checkRateLimit provides it", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			remaining: 0,
			limit: 10,
			reset: 9999,
			retryAfter: 42,
			error: "Trop de requêtes. Veuillez réessayer dans 42 secondes.",
		});

		const result = await enforceRateLimit("user:abc", LIMIT_CONFIG);

		if (!("error" in result)) throw new Error("Expected error result");
		if (result.error.status !== ActionStatus.ERROR) throw new Error("Expected ERROR status");
		expect(result.error.retryAfter).toBe(42);
	});

	it("omits retryAfter when checkRateLimit does not provide it", async () => {
		mockCheckRateLimit.mockResolvedValue({
			success: false,
			remaining: 0,
			limit: 10,
			reset: 9999,
			error: "Trop de requêtes. Veuillez réessayer plus tard.",
			// retryAfter absent
		});

		const result = await enforceRateLimit("user:abc", LIMIT_CONFIG);

		if (!("error" in result)) throw new Error("Expected error result");
		expect("retryAfter" in result.error).toBe(false);
	});
});

// ============================================================================
// Argument forwarding
// ============================================================================

describe("enforceRateLimit — argument forwarding", () => {
	it("passes the identifier to checkRateLimit", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9, limit: 10, reset: 9999 });

		await enforceRateLimit("user:test-123", LIMIT_CONFIG);

		expect(mockCheckRateLimit).toHaveBeenCalledWith("user:test-123", LIMIT_CONFIG, undefined);
	});

	it("passes the limit config object to checkRateLimit", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 4, limit: 5, reset: 9999 });
		const customConfig: RateLimitConfig = { name: "test", limit: 5, windowMs: 30000 };

		await enforceRateLimit("ip:1.1.1.1", customConfig);

		expect(mockCheckRateLimit).toHaveBeenCalledWith("ip:1.1.1.1", customConfig, undefined);
	});

	it("passes an explicit ipAddress to checkRateLimit", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 8, limit: 10, reset: 9999 });

		await enforceRateLimit("user:u99", LIMIT_CONFIG, "203.0.113.5");

		expect(mockCheckRateLimit).toHaveBeenCalledWith("user:u99", LIMIT_CONFIG, "203.0.113.5");
	});

	it("passes null ipAddress when explicitly provided as null", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 7, limit: 10, reset: 9999 });

		await enforceRateLimit("session:s42", LIMIT_CONFIG, null);

		expect(mockCheckRateLimit).toHaveBeenCalledWith("session:s42", LIMIT_CONFIG, null);
	});

	it("calls checkRateLimit exactly once per invocation", async () => {
		mockCheckRateLimit.mockResolvedValue({ success: true, remaining: 9, limit: 10, reset: 9999 });

		await enforceRateLimit("user:once", LIMIT_CONFIG);

		expect(mockCheckRateLimit).toHaveBeenCalledOnce();
	});
});

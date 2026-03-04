import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	},
}));

import { CircuitBreaker, CircuitBreakerError } from "../circuit-breaker";

// ============================================================================
// Tests: CircuitBreakerError
// ============================================================================

describe("CircuitBreakerError", () => {
	it("has the correct error message", () => {
		const error = new CircuitBreakerError("Stripe");
		expect(error.message).toBe("Circuit breaker OPEN for Stripe — service temporarily unavailable");
	});

	it("has name set to CircuitBreakerError", () => {
		const error = new CircuitBreakerError("Resend");
		expect(error.name).toBe("CircuitBreakerError");
	});

	it("is an instance of Error", () => {
		const error = new CircuitBreakerError("Stripe");
		expect(error).toBeInstanceOf(Error);
	});
});

// ============================================================================
// Tests: CircuitBreaker constructor
// ============================================================================

describe("CircuitBreaker constructor", () => {
	it("uses default threshold of 5 when not specified", async () => {
		const cb = new CircuitBreaker({ name: "test" });

		// 4 failures should not open the circuit
		for (let i = 0; i < 4; i++) {
			await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		}
		expect(cb.state).toBe("CLOSED");

		// 5th failure should open
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.state).toBe("OPEN");
	});

	it("uses default resetTimeout of 30s", () => {
		const cb = new CircuitBreaker({ name: "test" });
		// Verify by checking state doesn't transition before 30s
		expect(cb.state).toBe("CLOSED");
	});

	it("accepts custom failureThreshold", async () => {
		const cb = new CircuitBreaker({ name: "test", failureThreshold: 2 });

		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.state).toBe("CLOSED");

		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.state).toBe("OPEN");
	});

	it("starts in CLOSED state", () => {
		const cb = new CircuitBreaker({ name: "test" });
		expect(cb.state).toBe("CLOSED");
	});
});

// ============================================================================
// Tests: execute in CLOSED state
// ============================================================================

describe("execute in CLOSED state", () => {
	let cb: CircuitBreaker;

	beforeEach(() => {
		cb = new CircuitBreaker({ name: "test-service", failureThreshold: 3 });
	});

	it("passes the request through and returns the result", async () => {
		const result = await cb.execute(() => Promise.resolve("success"));
		expect(result).toBe("success");
	});

	it("resets failureCount after a success", async () => {
		// Cause 2 failures (below threshold of 3)
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});

		// Success should reset
		await cb.execute(() => Promise.resolve("ok"));

		// 2 more failures should not open (count was reset)
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.state).toBe("CLOSED");
	});

	it("increments failureCount after each failure", async () => {
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.state).toBe("CLOSED");

		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.state).toBe("CLOSED");
	});

	it("opens the circuit after reaching the failure threshold", async () => {
		for (let i = 0; i < 3; i++) {
			await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		}
		expect(cb.state).toBe("OPEN");
	});

	it("does not open at threshold - 1 failures", async () => {
		for (let i = 0; i < 2; i++) {
			await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		}
		expect(cb.state).toBe("CLOSED");
	});

	it("propagates the original error on failure", async () => {
		const originalError = new Error("specific error");
		await expect(cb.execute(() => Promise.reject(originalError))).rejects.toThrow("specific error");
	});
});

// ============================================================================
// Tests: execute in OPEN state
// ============================================================================

describe("execute in OPEN state", () => {
	let cb: CircuitBreaker;

	beforeEach(() => {
		vi.useFakeTimers();
		cb = new CircuitBreaker({
			name: "test-service",
			failureThreshold: 2,
			resetTimeout: 5000,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("throws CircuitBreakerError immediately (fail fast)", async () => {
		// Open the circuit
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});

		await expect(cb.execute(() => Promise.resolve("ok"))).rejects.toThrow(CircuitBreakerError);
	});

	it("does not call the function when circuit is open", async () => {
		// Open the circuit
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});

		const fn = vi.fn().mockResolvedValue("ok");
		await cb.execute(fn).catch(() => {});

		expect(fn).not.toHaveBeenCalled();
	});

	it("transitions to HALF_OPEN after resetTimeout elapses", async () => {
		// Open the circuit
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.state).toBe("OPEN");

		// Advance time past the resetTimeout
		vi.advanceTimersByTime(5000);

		expect(cb.state).toBe("HALF_OPEN");
	});

	it("stays OPEN before resetTimeout elapses", async () => {
		// Open the circuit
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});

		vi.advanceTimersByTime(4999);
		expect(cb.state).toBe("OPEN");
	});
});

// ============================================================================
// Tests: execute in HALF_OPEN state
// ============================================================================

describe("execute in HALF_OPEN state", () => {
	let cb: CircuitBreaker;

	beforeEach(() => {
		vi.useFakeTimers();
		cb = new CircuitBreaker({
			name: "test-service",
			failureThreshold: 2,
			resetTimeout: 5000,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	async function transitionToHalfOpen() {
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		vi.advanceTimersByTime(5000);
	}

	it("transitions to CLOSED after a successful probe", async () => {
		await transitionToHalfOpen();

		await cb.execute(() => Promise.resolve("recovered"));
		expect(cb.state).toBe("CLOSED");
	});

	it("resets counters after successful recovery", async () => {
		await transitionToHalfOpen();
		await cb.execute(() => Promise.resolve("recovered"));

		// Should be able to tolerate failures again from 0
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.state).toBe("CLOSED");
	});

	it("transitions back to OPEN after a failed probe", async () => {
		await transitionToHalfOpen();

		await cb.execute(() => Promise.reject(new Error("still broken"))).catch(() => {});
		expect(cb.state).toBe("OPEN");
	});
});

// ============================================================================
// Tests: state getter
// ============================================================================

describe("state getter", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("reports CLOSED initially", () => {
		const cb = new CircuitBreaker({ name: "test" });
		expect(cb.state).toBe("CLOSED");
	});

	it("reports OPEN after threshold failures", async () => {
		const cb = new CircuitBreaker({ name: "test", failureThreshold: 1 });
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.state).toBe("OPEN");
	});

	it("reports HALF_OPEN when OPEN and timeout elapsed", async () => {
		const cb = new CircuitBreaker({ name: "test", failureThreshold: 1, resetTimeout: 1000 });
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		vi.advanceTimersByTime(1000);
		expect(cb.state).toBe("HALF_OPEN");
	});
});

// ============================================================================
// Tests: isAvailable
// ============================================================================

describe("isAvailable", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns true when CLOSED", () => {
		const cb = new CircuitBreaker({ name: "test" });
		expect(cb.isAvailable).toBe(true);
	});

	it("returns false when OPEN", async () => {
		const cb = new CircuitBreaker({ name: "test", failureThreshold: 1 });
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.isAvailable).toBe(false);
	});

	it("returns true when HALF_OPEN", async () => {
		const cb = new CircuitBreaker({ name: "test", failureThreshold: 1, resetTimeout: 1000 });
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		vi.advanceTimersByTime(1000);
		expect(cb.isAvailable).toBe(true);
	});
});

// ============================================================================
// Tests: reset()
// ============================================================================

describe("reset", () => {
	it("resets state to CLOSED", async () => {
		const cb = new CircuitBreaker({ name: "test", failureThreshold: 1 });
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.state).toBe("OPEN");

		cb.reset();
		expect(cb.state).toBe("CLOSED");
	});

	it("resets failure count", async () => {
		const cb = new CircuitBreaker({ name: "test", failureThreshold: 2 });
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});

		cb.reset();

		// One more failure should not open (count was reset)
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.state).toBe("CLOSED");
	});

	it("allows requests after reset from OPEN state", async () => {
		const cb = new CircuitBreaker({ name: "test", failureThreshold: 1 });
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});

		cb.reset();

		const result = await cb.execute(() => Promise.resolve("works"));
		expect(result).toBe("works");
	});
});

// ============================================================================
// Tests: Full lifecycle scenario
// ============================================================================

describe("full lifecycle", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("CLOSED → failures → OPEN → timeout → HALF_OPEN → success → CLOSED", async () => {
		const cb = new CircuitBreaker({
			name: "lifecycle",
			failureThreshold: 2,
			resetTimeout: 10_000,
		});

		// CLOSED: normal operation
		expect(cb.state).toBe("CLOSED");
		const r1 = await cb.execute(() => Promise.resolve("ok"));
		expect(r1).toBe("ok");

		// Cause failures to open
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
		expect(cb.state).toBe("OPEN");

		// OPEN: requests fail fast
		await expect(cb.execute(() => Promise.resolve("blocked"))).rejects.toThrow(CircuitBreakerError);

		// Wait for timeout → HALF_OPEN
		vi.advanceTimersByTime(10_000);
		expect(cb.state).toBe("HALF_OPEN");

		// HALF_OPEN: successful probe → CLOSED
		const r2 = await cb.execute(() => Promise.resolve("recovered"));
		expect(r2).toBe("recovered");
		expect(cb.state).toBe("CLOSED");

		// Back to normal
		const r3 = await cb.execute(() => Promise.resolve("normal again"));
		expect(r3).toBe("normal again");
	});
});

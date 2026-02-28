import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockHeaders } = vi.hoisted(() => ({
	mockHeaders: vi.fn(),
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

import { verifyCronRequest, cronTimer, cronSuccess, cronError } from "../verify-cron";

// ============================================================================
// Helpers
// ============================================================================

function makeHeadersList(authorization: string | null) {
	return { get: (name: string) => (name === "authorization" ? authorization : null) };
}

// ============================================================================
// Tests: verifyCronRequest
// ============================================================================

describe("verifyCronRequest", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	describe("in development environment", () => {
		beforeEach(() => {
			vi.stubEnv("NODE_ENV", "development");
		});

		it("returns null without any verification", async () => {
			const result = await verifyCronRequest();

			expect(result).toBeNull();
		});

		it("does not read headers in development", async () => {
			await verifyCronRequest();

			expect(mockHeaders).not.toHaveBeenCalled();
		});

		it("does not attempt to read headers when NODE_ENV is development", async () => {
			// The only side-effect observable from outside is that headers() is never called
			// (timingSafeEqual is a native ESM export and cannot be spied on directly)
			await verifyCronRequest();

			expect(mockHeaders).not.toHaveBeenCalled();
		});
	});

	describe("in production environment", () => {
		beforeEach(() => {
			vi.stubEnv("NODE_ENV", "production");
		});

		describe("when CRON_SECRET is not set", () => {
			beforeEach(() => {
				vi.stubEnv("CRON_SECRET", "");
				// Delete the key entirely so !cronSecret evaluates to true
				delete process.env.CRON_SECRET;
			});

			it("returns a 500 response", async () => {
				const result = await verifyCronRequest();

				expect(result).not.toBeNull();
				expect(result!.status).toBe(500);
			});

			it("does not attempt to read the Authorization header", async () => {
				await verifyCronRequest();

				expect(mockHeaders).not.toHaveBeenCalled();
			});

			it("logs an error about missing secret", async () => {
				await verifyCronRequest();

				expect(console.error).toHaveBeenCalledWith(
					"[CRON] CRON_SECRET environment variable is not set",
				);
			});

			it("returns JSON body with error field", async () => {
				const result = await verifyCronRequest();
				const body = await result!.json();

				expect(body).toHaveProperty("error");
			});
		});

		describe("when CRON_SECRET is set", () => {
			const SECRET = "my-cron-secret";

			beforeEach(() => {
				vi.stubEnv("CRON_SECRET", SECRET);
			});

			it("returns 401 when Authorization header is absent", async () => {
				mockHeaders.mockResolvedValue(makeHeadersList(null));

				const result = await verifyCronRequest();

				expect(result).not.toBeNull();
				expect(result!.status).toBe(401);
			});

			it("returns 401 when Authorization header has wrong secret", async () => {
				// Same byte-length as the expected value to force timingSafeEqual to run
				const sameLength = "Bearer " + "x".repeat(SECRET.length);
				mockHeaders.mockResolvedValue(makeHeadersList(sameLength));

				const result = await verifyCronRequest();

				expect(result).not.toBeNull();
				expect(result!.status).toBe(401);
			});

			it("returns 401 when token does not use Bearer format", async () => {
				// "Token <secret>" has different byte-length than "Bearer <secret>" → short-circuits
				mockHeaders.mockResolvedValue(makeHeadersList("Token " + SECRET));

				const result = await verifyCronRequest();

				expect(result!.status).toBe(401);
			});

			it("returns null when the correct Bearer token is provided", async () => {
				mockHeaders.mockResolvedValue(makeHeadersList(`Bearer ${SECRET}`));

				const result = await verifyCronRequest();

				expect(result).toBeNull();
			});

			it("authorizes when token bytes exactly match the expected Bearer token", async () => {
				// The real timingSafeEqual runs; the only way to confirm it is used correctly
				// is to observe that an exact match returns null (authorized)
				mockHeaders.mockResolvedValue(makeHeadersList(`Bearer ${SECRET}`));

				const result = await verifyCronRequest();

				expect(result).toBeNull();
			});

			it("rejects when the token differs by one character while keeping the same length", async () => {
				// Forces timingSafeEqual to actually run (lengths match) and return false
				const lastChar = SECRET[SECRET.length - 1];
				const altChar = lastChar === "a" ? "b" : "a";
				const wrongSecret = SECRET.slice(0, -1) + altChar;
				mockHeaders.mockResolvedValue(makeHeadersList(`Bearer ${wrongSecret}`));

				const result = await verifyCronRequest();

				expect(result).not.toBeNull();
				expect(result!.status).toBe(401);
			});

			it("rejects without reaching the comparison when buffer lengths differ", async () => {
				// Empty authorization: Buffer.from("").length !== Buffer.from("Bearer secret").length
				// The source short-circuits before calling timingSafeEqual
				mockHeaders.mockResolvedValue(makeHeadersList(null));

				const result = await verifyCronRequest();

				expect(result!.status).toBe(401);
			});

			it("logs a warning on unauthorized request attempt", async () => {
				mockHeaders.mockResolvedValue(makeHeadersList(null));

				await verifyCronRequest();

				expect(console.warn).toHaveBeenCalledWith(
					"[CRON] Unauthorized cron request attempt",
					expect.objectContaining({ ip: expect.any(String) }),
				);
			});

			it("returns 401 JSON body with error field when unauthorized", async () => {
				// Buffer length differs → short-circuit, no timingSafeEqual call needed
				mockHeaders.mockResolvedValue(makeHeadersList("Bearer bad"));

				const result = await verifyCronRequest();
				const body = await result!.json();

				expect(body).toEqual({ error: "Unauthorized" });
			});
		});
	});
});

// ============================================================================
// Tests: cronTimer
// ============================================================================

describe("cronTimer", () => {
	it("returns a number", () => {
		const result = cronTimer();

		expect(typeof result).toBe("number");
	});

	it("returns approximately the current timestamp", () => {
		const before = Date.now();
		const result = cronTimer();
		const after = Date.now();

		expect(result).toBeGreaterThanOrEqual(before);
		expect(result).toBeLessThanOrEqual(after);
	});

	it("returns a positive integer", () => {
		const result = cronTimer();

		expect(result).toBeGreaterThan(0);
		expect(Number.isInteger(result)).toBe(true);
	});
});

// ============================================================================
// Tests: cronSuccess
// ============================================================================

describe("cronSuccess", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-24T10:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns a response with success: true", async () => {
		const response = cronSuccess({});
		const body = await response.json();

		expect(body.success).toBe(true);
	});

	it("includes a timestamp in ISO format", async () => {
		const response = cronSuccess({});
		const body = await response.json();

		expect(body.timestamp).toBe("2026-02-24T10:00:00.000Z");
	});

	it("spreads the provided data into the response body", async () => {
		const response = cronSuccess({ job: "cleanup-carts", deletedCount: 5 });
		const body = await response.json();

		expect(body.job).toBe("cleanup-carts");
		expect(body.deletedCount).toBe(5);
	});

	it("does not include durationMs when startTime is not provided", async () => {
		const response = cronSuccess({ job: "test" });
		const body = await response.json();

		expect(body).not.toHaveProperty("durationMs");
	});

	it("includes durationMs when startTime is provided", async () => {
		const startTime = Date.now() - 150;
		const response = cronSuccess({ job: "test" }, startTime);
		const body = await response.json();

		expect(body).toHaveProperty("durationMs");
		expect(typeof body.durationMs).toBe("number");
		expect(body.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("calculates durationMs as elapsed time since startTime", async () => {
		const startTime = Date.now() - 200;
		const response = cronSuccess({}, startTime);
		const body = await response.json();

		// With fake timers, Date.now() is fixed so durationMs = fixedNow - startTime
		expect(body.durationMs).toBe(Date.now() - startTime);
	});

	it("includes durationMs of 0 when startTime equals current time", async () => {
		const startTime = Date.now();
		const response = cronSuccess({}, startTime);
		const body = await response.json();

		expect(body.durationMs).toBe(0);
	});

	it("returns HTTP 200 status by default", () => {
		const response = cronSuccess({});

		expect(response.status).toBe(200);
	});

	it("data fields spread after base fields, allowing overrides", async () => {
		// The spread order is { success, timestamp, ...data } so data wins on collision
		const response = cronSuccess({ success: false, timestamp: "override" });
		const body = await response.json();

		expect(body.success).toBe(false);
		expect(body.timestamp).toBe("override");
	});
});

// ============================================================================
// Tests: cronError
// ============================================================================

describe("cronError", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-24T10:00:00.000Z"));
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns a response with success: false", async () => {
		const response = cronError("Something went wrong");
		const body = await response.json();

		expect(body.success).toBe(false);
	});

	it("includes the error message in the response body", async () => {
		const response = cronError("Cart cleanup failed");
		const body = await response.json();

		expect(body.error).toBe("Cart cleanup failed");
	});

	it("includes a timestamp in ISO format", async () => {
		const response = cronError("fail");
		const body = await response.json();

		expect(body.timestamp).toBe("2026-02-24T10:00:00.000Z");
	});

	it("returns HTTP 500 by default", () => {
		const response = cronError("fail");

		expect(response.status).toBe(500);
	});

	it("returns the custom status when provided", () => {
		const response = cronError("Not found", 404);

		expect(response.status).toBe(404);
	});

	it("logs the error message to console", () => {
		cronError("Database unreachable");

		expect(console.error).toHaveBeenCalledWith("[CRON] Error: Database unreachable");
	});

	it("response body does not include a success field set to true", async () => {
		const response = cronError("fail");
		const body = await response.json();

		expect(body.success).not.toBe(true);
	});
});

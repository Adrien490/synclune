import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPrisma, mockDispatchEmailTask, mockLogger } = vi.hoisted(() => ({
	mockPrisma: {
		failedEmail: { findMany: vi.fn(), update: vi.fn() },
	},
	mockDispatchEmailTask: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/modules/webhooks/utils/execute-post-tasks", () => ({
	dispatchEmailTask: mockDispatchEmailTask,
}));
vi.mock("@/modules/cron/constants/limits", () => ({
	BATCH_SIZE_MEDIUM: 25,
	BATCH_DEADLINE_MS: 5000,
	EMAIL_THROTTLE_MS: 0,
	MAX_EMAIL_RETRY_ATTEMPTS: 3,
	EMAIL_RETRY_BACKOFF_MINUTES: [60, 240, 960],
}));

import { retryFailedEmails } from "../retry-failed-emails.service";

// ============================================================================
// HELPERS
// ============================================================================

function makeFailedEmail(overrides: Record<string, unknown> = {}) {
	return {
		id: "email-1",
		taskType: "ORDER_CONFIRMATION",
		payload: {},
		attempts: 0,
		nextRetryAt: new Date("2026-03-07T10:00:00Z"),
		resolvedAt: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("retryFailedEmails", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPrisma.failedEmail.findMany.mockResolvedValue([]);
		mockPrisma.failedEmail.update.mockResolvedValue({});
		mockDispatchEmailTask.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// --------------------------------------------------------------------------
	// Empty case
	// --------------------------------------------------------------------------

	it("returns zero counts when no candidates found", async () => {
		const result = await retryFailedEmails();

		expect(result).toEqual({
			found: 0,
			retried: 0,
			resolved: 0,
			errors: 0,
			hasMore: false,
		});
	});

	// --------------------------------------------------------------------------
	// Query
	// --------------------------------------------------------------------------

	it("queries only unresolved emails due for retry below max attempts", async () => {
		await retryFailedEmails();

		const call = mockPrisma.failedEmail.findMany.mock.calls[0]![0];
		expect(call.where.resolvedAt).toBeNull();
		expect(call.where.nextRetryAt.lte).toBeInstanceOf(Date);
		expect(call.where.attempts).toEqual({ lt: 3 });
	});

	it("orders candidates by nextRetryAt ascending", async () => {
		await retryFailedEmails();

		const call = mockPrisma.failedEmail.findMany.mock.calls[0]![0];
		expect(call.orderBy).toEqual({ nextRetryAt: "asc" });
	});

	it("takes BATCH_SIZE_MEDIUM + 1 to detect overflow", async () => {
		await retryFailedEmails();

		const call = mockPrisma.failedEmail.findMany.mock.calls[0]![0];
		expect(call.take).toBe(26);
	});

	// --------------------------------------------------------------------------
	// Success flow
	// --------------------------------------------------------------------------

	it("dispatches email task with correct type and data", async () => {
		const email = makeFailedEmail({
			taskType: "SHIPPING_CONFIRMATION",
			payload: { orderId: "ord-1" },
		});
		mockPrisma.failedEmail.findMany.mockResolvedValue([email]);

		await retryFailedEmails();

		expect(mockDispatchEmailTask).toHaveBeenCalledWith({
			type: "SHIPPING_CONFIRMATION",
			data: { orderId: "ord-1" },
		});
	});

	it("marks email as resolved after successful dispatch", async () => {
		const email = makeFailedEmail();
		mockPrisma.failedEmail.findMany.mockResolvedValue([email]);

		await retryFailedEmails();

		expect(mockPrisma.failedEmail.update).toHaveBeenCalledWith({
			where: { id: "email-1" },
			data: { resolvedAt: expect.any(Date) },
		});
	});

	it("increments resolved count on success", async () => {
		mockPrisma.failedEmail.findMany.mockResolvedValue([makeFailedEmail()]);

		const result = await retryFailedEmails();

		expect(result.resolved).toBe(1);
		expect(result.retried).toBe(1);
		expect(result.errors).toBe(0);
	});

	// --------------------------------------------------------------------------
	// Failure flow
	// --------------------------------------------------------------------------

	it("increments errors count when dispatch throws", async () => {
		mockPrisma.failedEmail.findMany.mockResolvedValue([makeFailedEmail()]);
		mockDispatchEmailTask.mockRejectedValue(new Error("SMTP timeout"));

		const result = await retryFailedEmails();

		expect(result.errors).toBe(1);
		expect(result.resolved).toBe(0);
		expect(result.retried).toBe(1);
	});

	it("updates attempts and backoff nextRetryAt on failure", async () => {
		const now = new Date("2026-03-07T12:00:00Z");
		vi.useFakeTimers();
		vi.setSystemTime(now);

		const email = makeFailedEmail({ attempts: 0 });
		mockPrisma.failedEmail.findMany.mockResolvedValue([email]);
		mockDispatchEmailTask.mockRejectedValue(new Error("Send failed"));

		const promise = retryFailedEmails();
		await vi.runAllTimersAsync();
		await promise;

		const updateCall = mockPrisma.failedEmail.update.mock.calls[0]![0];
		expect(updateCall.where).toEqual({ id: "email-1" });
		expect(updateCall.data.attempts).toBe(1);
		expect(updateCall.data.lastError).toBe("Send failed");
		// attempt 0 → backoff 60 min
		const expectedNextRetry = now.getTime() + 60 * 60 * 1000;
		expect(updateCall.data.nextRetryAt.getTime()).toBe(expectedNextRetry);
	});

	it("uses backoff array index 0 (60 min) for first failure (attempts=0)", async () => {
		const now = new Date("2026-03-07T12:00:00Z");
		vi.useFakeTimers();
		vi.setSystemTime(now);

		const email = makeFailedEmail({ attempts: 0 });
		mockPrisma.failedEmail.findMany.mockResolvedValue([email]);
		mockDispatchEmailTask.mockRejectedValue(new Error("fail"));

		const promise = retryFailedEmails();
		await vi.runAllTimersAsync();
		await promise;

		const updateCall = mockPrisma.failedEmail.update.mock.calls[0]![0];
		expect(updateCall.data.nextRetryAt.getTime()).toBe(now.getTime() + 60 * 60 * 1000);
	});

	it("uses backoff array index 1 (240 min) for second failure (attempts=1)", async () => {
		const now = new Date("2026-03-07T12:00:00Z");
		vi.useFakeTimers();
		vi.setSystemTime(now);

		const email = makeFailedEmail({ attempts: 1 });
		mockPrisma.failedEmail.findMany.mockResolvedValue([email]);
		mockDispatchEmailTask.mockRejectedValue(new Error("fail"));

		const promise = retryFailedEmails();
		await vi.runAllTimersAsync();
		await promise;

		const updateCall = mockPrisma.failedEmail.update.mock.calls[0]![0];
		expect(updateCall.data.nextRetryAt.getTime()).toBe(now.getTime() + 240 * 60 * 1000);
	});

	it("falls back to 960 min when attempts index exceeds backoff array length", async () => {
		const now = new Date("2026-03-07T12:00:00Z");
		vi.useFakeTimers();
		vi.setSystemTime(now);

		// attempts=5 is beyond the [60, 240, 960] array (indices 0-2)
		const email = makeFailedEmail({ attempts: 5 });
		mockPrisma.failedEmail.findMany.mockResolvedValue([email]);
		mockDispatchEmailTask.mockRejectedValue(new Error("fail"));

		const promise = retryFailedEmails();
		await vi.runAllTimersAsync();
		await promise;

		const updateCall = mockPrisma.failedEmail.update.mock.calls[0]![0];
		expect(updateCall.data.nextRetryAt.getTime()).toBe(now.getTime() + 960 * 60 * 1000);
	});

	it("extracts message from Error instance for lastError", async () => {
		mockPrisma.failedEmail.findMany.mockResolvedValue([makeFailedEmail()]);
		mockDispatchEmailTask.mockRejectedValue(new Error("Detailed error message"));

		await retryFailedEmails();

		const updateCall = mockPrisma.failedEmail.update.mock.calls[0]![0];
		expect(updateCall.data.lastError).toBe("Detailed error message");
	});

	it("converts non-Error throws to string for lastError", async () => {
		mockPrisma.failedEmail.findMany.mockResolvedValue([makeFailedEmail()]);
		mockDispatchEmailTask.mockRejectedValue("plain string error");

		await retryFailedEmails();

		const updateCall = mockPrisma.failedEmail.update.mock.calls[0]![0];
		expect(updateCall.data.lastError).toBe("plain string error");
	});

	it("catches DB update failure and continues processing next emails", async () => {
		const emails = [makeFailedEmail({ id: "email-1" }), makeFailedEmail({ id: "email-2" })];
		mockPrisma.failedEmail.findMany.mockResolvedValue(emails);
		mockDispatchEmailTask
			.mockRejectedValueOnce(new Error("dispatch fail"))
			.mockResolvedValueOnce(undefined);
		mockPrisma.failedEmail.update
			.mockRejectedValueOnce(new Error("DB write failed")) // first email DB update fails
			.mockResolvedValueOnce({}); // second email resolves

		const result = await retryFailedEmails();

		// DB error logged but processing continued
		expect(mockLogger.error).toHaveBeenCalled();
		expect(result.retried).toBe(2);
		expect(result.resolved).toBe(1);
	});

	// --------------------------------------------------------------------------
	// Batch
	// --------------------------------------------------------------------------

	it("returns hasMore=true when candidates exceed BATCH_SIZE_MEDIUM", async () => {
		// findMany returns 26 items (BATCH_SIZE_MEDIUM + 1)
		const emails = Array.from({ length: 26 }, (_, i) => makeFailedEmail({ id: `email-${i}` }));
		mockPrisma.failedEmail.findMany.mockResolvedValue(emails);

		const result = await retryFailedEmails();

		expect(result.hasMore).toBe(true);
	});

	it("returns hasMore=false when candidates do not exceed BATCH_SIZE_MEDIUM", async () => {
		mockPrisma.failedEmail.findMany.mockResolvedValue([makeFailedEmail()]);

		const result = await retryFailedEmails();

		expect(result.hasMore).toBe(false);
	});

	it("slices batch to BATCH_SIZE_MEDIUM even when more candidates returned", async () => {
		const emails = Array.from({ length: 26 }, (_, i) => makeFailedEmail({ id: `email-${i}` }));
		mockPrisma.failedEmail.findMany.mockResolvedValue(emails);

		const result = await retryFailedEmails();

		// Only 25 processed (BATCH_SIZE_MEDIUM), not 26
		expect(result.found).toBe(25);
		expect(result.retried).toBe(25);
	});

	it("stops early when BATCH_DEADLINE_MS is exceeded mid-batch", async () => {
		const emails = Array.from({ length: 5 }, (_, i) => makeFailedEmail({ id: `email-${i}` }));
		mockPrisma.failedEmail.findMany.mockResolvedValue(emails);

		const realNow = Date.now();
		let callCount = 0;
		const nowSpy = vi.spyOn(Date, "now");
		// Return a normal timestamp until first dispatch completes, then exceed deadline
		nowSpy.mockImplementation(() => {
			callCount++;
			// First two calls (batchStart capture + first loop check) are normal
			if (callCount <= 2) return realNow;
			// Subsequent calls simulate deadline exceeded
			return realNow + 10000;
		});

		const result = await retryFailedEmails();

		nowSpy.mockRestore();
		expect(mockLogger.warn).toHaveBeenCalledWith(
			expect.stringContaining("Deadline exceeded"),
			expect.any(Object),
		);
		expect(result.retried).toBeLessThan(5);
	});

	it("throttles between emails (EMAIL_THROTTLE_MS applied per item)", async () => {
		const emails = [makeFailedEmail({ id: "email-1" }), makeFailedEmail({ id: "email-2" })];
		mockPrisma.failedEmail.findMany.mockResolvedValue(emails);

		// With EMAIL_THROTTLE_MS=0 mocked, both should process without delay
		const result = await retryFailedEmails();

		expect(result.retried).toBe(2);
	});

	// --------------------------------------------------------------------------
	// Mixed results
	// --------------------------------------------------------------------------

	it("returns correct counts for a mix of successes and failures", async () => {
		const emails = [
			makeFailedEmail({ id: "email-1" }),
			makeFailedEmail({ id: "email-2" }),
			makeFailedEmail({ id: "email-3" }),
		];
		mockPrisma.failedEmail.findMany.mockResolvedValue(emails);
		mockDispatchEmailTask
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error("fail"))
			.mockResolvedValueOnce(undefined);

		const result = await retryFailedEmails();

		expect(result).toEqual({
			found: 3,
			retried: 3,
			resolved: 2,
			errors: 1,
			hasMore: false,
		});
	});
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockVerifyCronRequest,
	mockCronTimer,
	mockCronSuccess,
	mockCronError,
	mockProcessScheduledClosure,
	mockSendAdminCronFailedAlert,
	mockLoggerError,
} = vi.hoisted(() => ({
	mockVerifyCronRequest: vi.fn(),
	mockCronTimer: vi.fn(),
	mockCronSuccess: vi.fn(),
	mockCronError: vi.fn(),
	mockProcessScheduledClosure: vi.fn(),
	mockSendAdminCronFailedAlert: vi.fn(),
	mockLoggerError: vi.fn(),
}));

vi.mock("@/modules/cron/lib/verify-cron", () => ({
	verifyCronRequest: mockVerifyCronRequest,
	cronTimer: mockCronTimer,
	cronSuccess: mockCronSuccess,
	cronError: mockCronError,
}));

vi.mock("@/modules/cron/services/process-scheduled-closure.service", () => ({
	processScheduledClosure: mockProcessScheduledClosure,
}));

vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminCronFailedAlert: mockSendAdminCronFailedAlert,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { error: mockLoggerError },
}));

import { GET, maxDuration } from "../route";

// ============================================================================
// Helpers
// ============================================================================

function makeUnauthorizedResponse() {
	return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}

function makeSuccessResponse(data: Record<string, unknown>) {
	return new Response(JSON.stringify({ success: true, ...data }), { status: 200 });
}

function makeErrorResponse(message: string) {
	return new Response(JSON.stringify({ success: false, error: message }), { status: 500 });
}

const DEFAULT_RESULT = { closed: true, scheduledCloseAt: "2026-04-17T20:00:00Z" };

// ============================================================================
// maxDuration export
// ============================================================================

describe("maxDuration", () => {
	it("is exported as 30", () => {
		expect(maxDuration).toBe(30);
	});
});

// ============================================================================
// GET handler
// ============================================================================

describe("GET /api/cron/process-scheduled-closure", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockVerifyCronRequest.mockResolvedValue(null);
		mockCronTimer.mockReturnValue(1234);
		mockProcessScheduledClosure.mockResolvedValue(DEFAULT_RESULT);
		mockSendAdminCronFailedAlert.mockResolvedValue(undefined);
		mockCronSuccess.mockImplementation((data: Record<string, unknown>) =>
			makeSuccessResponse(data),
		);
		mockCronError.mockImplementation((message: string) => makeErrorResponse(message));
	});

	describe("authorization", () => {
		it("returns the unauthorized response when verifyCronRequest returns one", async () => {
			const unauthorized = makeUnauthorizedResponse();
			mockVerifyCronRequest.mockResolvedValue(unauthorized);

			const result = await GET();

			expect(result).toBe(unauthorized);
		});

		it("does not call processScheduledClosure when unauthorized", async () => {
			mockVerifyCronRequest.mockResolvedValue(makeUnauthorizedResponse());

			await GET();

			expect(mockProcessScheduledClosure).not.toHaveBeenCalled();
		});

		it("proceeds when verifyCronRequest returns null", async () => {
			await GET();

			expect(mockProcessScheduledClosure).toHaveBeenCalledOnce();
		});
	});

	describe("successful execution", () => {
		it("calls cronSuccess with job name and service result", async () => {
			await GET();

			expect(mockCronSuccess).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "process-scheduled-closure",
					closed: true,
					scheduledCloseAt: "2026-04-17T20:00:00Z",
				}),
				1234,
			);
		});

		it("does not send admin alert on success", async () => {
			await GET();

			expect(mockSendAdminCronFailedAlert).not.toHaveBeenCalled();
		});

		it("does not call cronError on success", async () => {
			await GET();

			expect(mockCronError).not.toHaveBeenCalled();
		});
	});

	describe("error handling", () => {
		it("sends admin alert when service throws", async () => {
			mockProcessScheduledClosure.mockRejectedValue(new Error("DB unreachable"));

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					job: "process-scheduled-closure",
					errors: 1,
					details: expect.objectContaining({ error: "DB unreachable" }),
				}),
			);
		});

		it("stringifies non-Error throwables in alert details", async () => {
			mockProcessScheduledClosure.mockRejectedValue("boom");

			await GET();

			expect(mockSendAdminCronFailedAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					details: expect.objectContaining({ error: "boom" }),
				}),
			);
		});

		it("calls cronError with the error message", async () => {
			mockProcessScheduledClosure.mockRejectedValue(new Error("fail-msg"));

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("fail-msg");
		});

		it("uses fallback message when a non-Error is thrown", async () => {
			mockProcessScheduledClosure.mockRejectedValue("boom");

			await GET();

			expect(mockCronError).toHaveBeenCalledWith("Failed to process scheduled closure");
		});

		it("does not call cronSuccess when the service throws", async () => {
			mockProcessScheduledClosure.mockRejectedValue(new Error("fail"));

			await GET();

			expect(mockCronSuccess).not.toHaveBeenCalled();
		});

		it("logs to logger.error when admin alert delivery fails", async () => {
			mockProcessScheduledClosure.mockRejectedValue(new Error("svc fail"));
			mockSendAdminCronFailedAlert.mockRejectedValue(new Error("email fail"));

			await GET();

			// Wait microtask queue to drain (alert send is fire-and-forget with .catch)
			await new Promise<void>((resolve) => setTimeout(resolve, 0));

			expect(mockLoggerError).toHaveBeenCalledWith(
				expect.stringContaining("admin alert"),
				expect.any(Error),
				expect.objectContaining({ cronJob: "process-scheduled-closure" }),
			);
		});
	});
});

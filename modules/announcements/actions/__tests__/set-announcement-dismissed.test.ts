import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockDismissAnnouncementAction,
	mockSuccess,
	mockError,
	mockValidateInput,
	mockEnforceRateLimit,
	mockGetClientIp,
	mockHeaders,
} = vi.hoisted(() => ({
	mockDismissAnnouncementAction: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockValidateInput: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockHeaders: vi.fn(),
}));

vi.mock("../dismiss-announcement", () => ({
	dismissAnnouncementAction: mockDismissAnnouncementAction,
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	error: mockError,
	handleActionError: (_e: unknown, msg: string) => ({
		status: ActionStatus.ERROR,
		message: msg,
	}),
}));

vi.mock("@/shared/lib/actions/rate-limit", () => ({
	enforceRateLimit: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	getClientIp: mockGetClientIp,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	PUBLIC_ANNOUNCEMENT_DISMISS_LIMIT: { limit: 60, windowMs: 60_000 },
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
}));

import { setAnnouncementDismissed } from "../set-announcement-dismissed";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(data: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [key, value] of Object.entries(data)) {
		fd.set(key, value);
	}
	return fd;
}

// ============================================================================
// TESTS
// ============================================================================

describe("setAnnouncementDismissed", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockHeaders.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.1" }));
		mockGetClientIp.mockResolvedValue("203.0.113.1");
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			success: true,
			data: { announcementId: "abc-123", dismissDurationHours: 24 },
		});
		mockDismissAnnouncementAction.mockResolvedValue({ success: true });
		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
	});

	// ─── Rate limit ───────────────────────────────────────────────────────────

	it("should return rate limit error when exceeded", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const fd = createFormData({ announcementId: "abc-123", dismissDurationHours: "24" });
		const result = await setAnnouncementDismissed(undefined, fd);

		expect(result).toEqual(rateLimitError);
		expect(mockDismissAnnouncementAction).not.toHaveBeenCalled();
	});

	it("should call enforceRateLimit with IP-scoped key", async () => {
		const fd = createFormData({ announcementId: "abc-123", dismissDurationHours: "24" });
		await setAnnouncementDismissed(undefined, fd);

		expect(mockEnforceRateLimit).toHaveBeenCalledWith(
			"announcement-dismiss:203.0.113.1",
			{ limit: 60, windowMs: 60_000 },
			"203.0.113.1",
		);
	});

	it("should fallback to 'unknown' IP when client IP cannot be resolved", async () => {
		mockGetClientIp.mockResolvedValue(null);

		const fd = createFormData({ announcementId: "abc-123", dismissDurationHours: "24" });
		await setAnnouncementDismissed(undefined, fd);

		expect(mockEnforceRateLimit).toHaveBeenCalledWith(
			"announcement-dismiss:unknown",
			expect.anything(),
			"unknown",
		);
	});

	// ─── Core behavior ────────────────────────────────────────────────────────

	it("should return success when dismiss succeeds", async () => {
		const fd = createFormData({ announcementId: "abc-123", dismissDurationHours: "24" });
		const result = await setAnnouncementDismissed(undefined, fd);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockDismissAnnouncementAction).toHaveBeenCalledWith("abc-123", 24);
	});

	it("should return validation error for invalid input", async () => {
		const validationError = { status: ActionStatus.ERROR, message: "Invalid input" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const fd = createFormData({ announcementId: "", dismissDurationHours: "" });
		const result = await setAnnouncementDismissed(undefined, fd);

		expect(result).toEqual(validationError);
		expect(mockDismissAnnouncementAction).not.toHaveBeenCalled();
	});

	it("should return error when dismissAnnouncementAction throws", async () => {
		mockDismissAnnouncementAction.mockRejectedValue(new Error("Cookie error"));

		const fd = createFormData({ announcementId: "abc-123", dismissDurationHours: "24" });
		const result = await setAnnouncementDismissed(undefined, fd);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("masquage");
	});

	it("should pass formData values to validateInput", async () => {
		const fd = createFormData({ announcementId: "test-id", dismissDurationHours: "48" });
		await setAnnouncementDismissed(undefined, fd);

		expect(mockValidateInput).toHaveBeenCalledWith(expect.any(Object), {
			announcementId: "test-id",
			dismissDurationHours: "48",
		});
	});
});

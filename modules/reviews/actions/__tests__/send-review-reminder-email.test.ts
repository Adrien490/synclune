import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidationError,
	mockHandleActionError,
	mockExecuteReviewReminderEmail,
	mockSafeParse,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidationError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockExecuteReviewReminderEmail: vi.fn(),
	mockSafeParse: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_REVIEW_LIMITS: { SEND_REMINDER: "send_reminder" },
}));
vi.mock("@/shared/lib/actions", () => ({
	validationError: mockValidationError,
	handleActionError: mockHandleActionError,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		INVALID_DATA: "Données invalides",
		REMINDER_FAILED: "Erreur rappel",
	},
}));
vi.mock("../../schemas/review.schemas", () => ({
	sendReviewReminderEmailSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../services/send-review-reminder-email.service", () => ({
	executeReviewReminderEmail: mockExecuteReviewReminderEmail,
}));

import { sendReviewReminderEmailAction } from "../send-review-reminder-email";

// ============================================================================
// TESTS
// ============================================================================

const ORDER_ID = VALID_CUID;

describe("sendReviewReminderEmailAction", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSafeParse.mockReturnValue({ success: true, data: { orderId: ORDER_ID } });
		mockExecuteReviewReminderEmail.mockResolvedValue({
			status: ActionStatus.SUCCESS,
			message: "Rappel envoye",
		});

		mockValidationError.mockImplementation((msg: string) => ({
			status: ActionStatus.VALIDATION_ERROR,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when user is not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await sendReviewReminderEmailAction(
			undefined,
			createMockFormData({ orderId: ORDER_ID }),
		);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockExecuteReviewReminderEmail).not.toHaveBeenCalled();
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await sendReviewReminderEmailAction(
			undefined,
			createMockFormData({ orderId: ORDER_ID }),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockExecuteReviewReminderEmail).not.toHaveBeenCalled();
	});

	it("uses SEND_REMINDER rate limit (not SEND_EMAIL)", async () => {
		await sendReviewReminderEmailAction(undefined, createMockFormData({ orderId: ORDER_ID }));
		expect(mockEnforceRateLimit).toHaveBeenCalledWith("send_reminder");
	});

	it("returns validation error when schema fails", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: { issues: [{ path: ["orderId"], message: "ID invalide" }] },
		});
		const result = await sendReviewReminderEmailAction(
			undefined,
			createMockFormData({ orderId: "" }),
		);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockExecuteReviewReminderEmail).not.toHaveBeenCalled();
	});

	it("delegates to executeReviewReminderEmail with validated orderId", async () => {
		const result = await sendReviewReminderEmailAction(
			undefined,
			createMockFormData({ orderId: ORDER_ID }),
		);

		expect(mockExecuteReviewReminderEmail).toHaveBeenCalledWith(ORDER_ID);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockExecuteReviewReminderEmail.mockRejectedValue(new Error("Service crash"));
		const result = await sendReviewReminderEmailAction(
			undefined,
			createMockFormData({ orderId: ORDER_ID }),
		);
		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), "Erreur rappel");
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

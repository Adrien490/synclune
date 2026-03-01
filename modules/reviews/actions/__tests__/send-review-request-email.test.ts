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
	mockExecuteReviewRequestEmail,
	mockSafeParse,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidationError: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockExecuteReviewRequestEmail: vi.fn(),
	mockSafeParse: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_REVIEW_LIMITS: { SEND_EMAIL: "send_email" },
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validationError: mockValidationError,
	handleActionError: mockHandleActionError,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		INVALID_DATA: "Données invalides",
		EMAIL_FAILED: "Erreur envoi email",
	},
}));
vi.mock("../../schemas/review.schemas", () => ({
	sendReviewRequestEmailSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../services/send-review-request-email.service", () => ({
	executeReviewRequestEmail: mockExecuteReviewRequestEmail,
}));

import { sendReviewRequestEmailAction } from "../send-review-request-email";

// ============================================================================
// TESTS
// ============================================================================

const ORDER_ID = VALID_CUID;

describe("sendReviewRequestEmailAction", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSafeParse.mockReturnValue({ success: true, data: { orderId: ORDER_ID } });
		mockExecuteReviewRequestEmail.mockResolvedValue({
			status: ActionStatus.SUCCESS,
			message: "Email envoyé",
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
		const result = await sendReviewRequestEmailAction(
			undefined,
			createMockFormData({ orderId: ORDER_ID }),
		);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockExecuteReviewRequestEmail).not.toHaveBeenCalled();
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await sendReviewRequestEmailAction(
			undefined,
			createMockFormData({ orderId: ORDER_ID }),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error when schema fails", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: { issues: [{ path: ["orderId"], message: "ID invalide" }] },
		});
		const result = await sendReviewRequestEmailAction(
			undefined,
			createMockFormData({ orderId: "" }),
		);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("delegates to executeReviewRequestEmail with validated orderId", async () => {
		const result = await sendReviewRequestEmailAction(
			undefined,
			createMockFormData({ orderId: ORDER_ID }),
		);

		expect(mockExecuteReviewRequestEmail).toHaveBeenCalledWith(ORDER_ID);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockExecuteReviewRequestEmail.mockRejectedValue(new Error("Service crash"));
		const result = await sendReviewRequestEmailAction(
			undefined,
			createMockFormData({ orderId: ORDER_ID }),
		);
		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), "Erreur envoi email");
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAuth,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockNotFound,
	mockForbidden,
	mockSanitizeForEmail,
	mockSendCustomizationStatusEmail,
	mockCanCustomerCancel,
	mockGetCustomizationInvalidationTags,
	mockLoggerInfo,
	mockLoggerError,
} = vi.hoisted(() => ({
	mockPrisma: {
		customizationRequest: {
			findFirst: vi.fn(),
			updateMany: vi.fn(),
		},
	},
	mockRequireAuth: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockForbidden: vi.fn(),
	mockSanitizeForEmail: vi.fn(),
	mockSendCustomizationStatusEmail: vi.fn(),
	mockCanCustomerCancel: vi.fn(),
	mockGetCustomizationInvalidationTags: vi.fn(),
	mockLoggerInfo: vi.fn(),
	mockLoggerError: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAuth: mockRequireAuth,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	CUSTOMIZATION_CUSTOMER_CANCEL_LIMIT: { limit: 3, windowMs: 3600000 },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
	forbidden: mockForbidden,
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeForEmail: mockSanitizeForEmail,
}));

vi.mock("@/modules/emails/services/customization-emails", () => ({
	sendCustomizationStatusEmail: mockSendCustomizationStatusEmail,
}));

vi.mock("../../services/customization-status.service", () => ({
	canCustomerCancel: mockCanCustomerCancel,
}));

vi.mock("../../constants/cache", () => ({
	getCustomizationInvalidationTags: mockGetCustomizationInvalidationTags,
	CUSTOMIZATION_CACHE_TAGS: {
		LIST: "customization-requests-list",
		STATS: "customization-requests-stats",
		DETAIL: (id: string) => `customization-request-${id}`,
		USER_REQUESTS: (userId: string) => `customization-requests-user-${userId}`,
	},
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { info: mockLoggerInfo, error: mockLoggerError, warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
}));

import { cancelCustomizationRequestCustomer } from "../cancel-customization-request-customer";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(data: Record<string, string> = {}): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(data)) {
		formData.set(key, value);
	}
	return formData;
}

const VALID_FORM_DATA = createFormData({ requestId: "cm1234567890abcdefghijklm" });

const MOCK_USER = { id: "user_abc", name: "Marie", email: "marie@example.com" };

const MOCK_EXISTING_REQUEST = {
	id: "cm1234567890abcdefghijklm",
	userId: "user_abc",
	status: "PENDING",
	email: "marie@example.com",
	firstName: "Marie",
	productTypeLabel: "Bague",
	details: "Une bague gravée",
	adminNotes: null,
};

// ============================================================================
// TESTS
// ============================================================================

describe("cancelCustomizationRequestCustomer", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAuth.mockResolvedValue({ user: MOCK_USER });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { requestId: "cm1234567890abcdefghijklm" },
		});
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({ ...MOCK_EXISTING_REQUEST });
		mockCanCustomerCancel.mockReturnValue(true);
		mockPrisma.customizationRequest.updateMany.mockResolvedValue({ count: 1 });
		mockSanitizeForEmail.mockImplementation((str: string) => str);
		mockSendCustomizationStatusEmail.mockResolvedValue({ success: true });
		mockGetCustomizationInvalidationTags.mockReturnValue([
			"customization-requests-list",
			"customization-requests-stats",
			"admin-badges",
		]);

		mockSuccess.mockImplementation((message: string) => ({
			status: ActionStatus.SUCCESS,
			message,
		}));
		mockError.mockImplementation((message: string) => ({
			status: ActionStatus.ERROR,
			message,
		}));
		mockNotFound.mockImplementation((message: string) => ({
			status: ActionStatus.NOT_FOUND,
			message,
		}));
		mockForbidden.mockImplementation((message: string) => ({
			status: ActionStatus.FORBIDDEN,
			message,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// ── Auth ────────────────────────────────────────────────────────

	it("should return auth error when not authenticated", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAuth.mockResolvedValue({ error: authError });

		const result = await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(result).toEqual(authError);
		expect(mockPrisma.customizationRequest.updateMany).not.toHaveBeenCalled();
	});

	// ── Rate limit ──────────────────────────────────────────────────

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop d'annulations" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.customizationRequest.updateMany).not.toHaveBeenCalled();
	});

	// ── Validation ──────────────────────────────────────────────────

	it("should return validation error for invalid input", async () => {
		const validationError = {
			status: ActionStatus.VALIDATION_ERROR,
			message: "ID invalide",
		};
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(result).toEqual(validationError);
		expect(mockPrisma.customizationRequest.findFirst).not.toHaveBeenCalled();
	});

	// ── Not found ───────────────────────────────────────────────────

	it("should return notFound when request does not exist", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue(null);

		const result = await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.customizationRequest.updateMany).not.toHaveBeenCalled();
	});

	// ── IDOR protection ─────────────────────────────────────────────

	it("should return forbidden when request belongs to another user", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			userId: "another_user",
		});

		const result = await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.customizationRequest.updateMany).not.toHaveBeenCalled();
	});

	it("should return forbidden when request has no userId (guest)", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			userId: null,
		});

		const result = await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockPrisma.customizationRequest.updateMany).not.toHaveBeenCalled();
	});

	// ── Already cancelled ──────────────────────────────────────────

	it("should return error if request is already CANCELLED", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			status: "CANCELLED",
		});

		const result = await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("déjà annulée");
		expect(mockPrisma.customizationRequest.updateMany).not.toHaveBeenCalled();
	});

	// ── State machine ───────────────────────────────────────────────

	it("should return error when canCustomerCancel returns false (e.g. IN_PROGRESS)", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			status: "IN_PROGRESS",
		});
		mockCanCustomerCancel.mockReturnValue(false);

		const result = await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("ne peut plus");
		expect(mockPrisma.customizationRequest.updateMany).not.toHaveBeenCalled();
	});

	// ── Optimistic lock ─────────────────────────────────────────────

	it("should update with optimistic lock (status filter in WHERE)", async () => {
		await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(mockPrisma.customizationRequest.updateMany).toHaveBeenCalledWith({
			where: { id: "cm1234567890abcdefghijklm", status: "PENDING" },
			data: { status: "CANCELLED" },
		});
	});

	it("should return error when concurrent modification detected", async () => {
		mockPrisma.customizationRequest.updateMany.mockResolvedValue({ count: 0 });

		const result = await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("modifié");
	});

	// ── Cache invalidation ──────────────────────────────────────────

	it("should invalidate admin + detail + user cache tags on success", async () => {
		await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-stats");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-request-cm1234567890abcdefghijklm");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-user-user_abc");
	});

	// ── Email ───────────────────────────────────────────────────────

	it("should send CANCELLED status email to customer with sanitized PII", async () => {
		mockSanitizeForEmail.mockImplementation((str: string) => `s:${str}`);

		await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(mockSendCustomizationStatusEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "s:marie@example.com",
				firstName: "s:Marie",
				status: "CANCELLED",
			}),
		);
	});

	it("should NOT send email when customer email is missing", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			email: "",
		});

		await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(mockSendCustomizationStatusEmail).not.toHaveBeenCalled();
	});

	it("should not fail action when status email throws", async () => {
		mockSendCustomizationStatusEmail.mockRejectedValue(new Error("SMTP down"));

		const result = await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ── Logger ──────────────────────────────────────────────────────

	it("should log customer cancellation via logger.info", async () => {
		await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(mockLoggerInfo).toHaveBeenCalledWith(
			expect.stringContaining("cancelled by customer"),
			expect.objectContaining({
				requestId: "cm1234567890abcdefghijklm",
				userId: "user_abc",
				previousStatus: "PENDING",
			}),
		);
	});

	// ── Success ─────────────────────────────────────────────────────

	it("should return success on valid cancellation", async () => {
		const result = await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ── Error handling ──────────────────────────────────────────────

	it("should call handleActionError when DB throws", async () => {
		mockPrisma.customizationRequest.updateMany.mockRejectedValue(new Error("DB down"));

		const result = await cancelCustomizationRequestCustomer(undefined, VALID_FORM_DATA);

		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

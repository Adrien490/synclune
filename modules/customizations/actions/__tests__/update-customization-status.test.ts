import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockSanitizeForEmail,
	mockSendCustomizationStatusEmail,
	mockCanTransitionTo,
	mockGetCustomizationInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		customizationRequest: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockSanitizeForEmail: vi.fn(),
	mockSendCustomizationStatusEmail: vi.fn(),
	mockCanTransitionTo: vi.fn(),
	mockGetCustomizationInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_CUSTOMIZATION_LIMITS: { UPDATE: "admin-customization-update" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeForEmail: mockSanitizeForEmail,
}));

vi.mock("@/modules/emails/services/customization-emails", () => ({
	sendCustomizationStatusEmail: mockSendCustomizationStatusEmail,
}));

vi.mock("../../services/customization-status.service", () => ({
	canTransitionTo: mockCanTransitionTo,
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

vi.mock("../../schemas/update-status.schema", () => ({
	updateStatusSchema: {},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	CustomizationRequestStatus: {
		PENDING: "PENDING",
		IN_PROGRESS: "IN_PROGRESS",
		COMPLETED: "COMPLETED",
		CANCELLED: "CANCELLED",
	},
}));

import { updateCustomizationStatus } from "../update-customization-status";

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

const VALID_FORM_DATA = createFormData({
	requestId: "cm1234567890abcdefghijklm",
	status: "IN_PROGRESS",
});

const MOCK_EXISTING_REQUEST = {
	id: "cm1234567890abcdefghijklm",
	userId: "user_abc",
	status: "PENDING",
	email: "marie@example.com",
	firstName: "Marie",
	productTypeLabel: "Bague",
	details: "Je souhaite une bague gravée",
	adminNotes: null,
};

// ============================================================================
// TESTS
// ============================================================================

describe("updateCustomizationStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: admin authenticated
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin_abc" } });

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: validation passes
		mockValidateInput.mockReturnValue({
			data: { requestId: "cm1234567890abcdefghijklm", status: "IN_PROGRESS" },
		});

		// Default: request exists
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
		});

		// Default: transition is valid
		mockCanTransitionTo.mockReturnValue(true);

		// Default: update succeeds
		mockPrisma.customizationRequest.update.mockResolvedValue({});

		// Default: sanitize passes through
		mockSanitizeForEmail.mockImplementation((str: string) => str);

		// Default: email sends successfully (fire-and-forget, returns Promise)
		mockSendCustomizationStatusEmail.mockResolvedValue({ success: true });

		// Default: cache tags
		mockGetCustomizationInvalidationTags.mockReturnValue([
			"customization-requests-list",
			"customization-requests-stats",
			"admin-badges",
		]);

		// Default: response helpers
		mockSuccess.mockImplementation((message: string) => ({
			status: ActionStatus.SUCCESS,
			message,
		}));
		mockError.mockImplementation((message: string) => ({
			status: ActionStatus.ERROR,
			message,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(result).toEqual(authError);
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limit
	// ──────────────────────────────────────────────────────────────

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid input", async () => {
		const validationError = {
			status: ActionStatus.VALIDATION_ERROR,
			message: "requestId invalide",
		};
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(result).toEqual(validationError);
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Not found
	// ──────────────────────────────────────────────────────────────

	it("should return error when request does not exist", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue(null);

		const result = await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("non trouvee");
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Status transition
	// ──────────────────────────────────────────────────────────────

	it("should return error when status transition is invalid", async () => {
		mockCanTransitionTo.mockReturnValue(false);

		const result = await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Transition");
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// respondedAt
	// ──────────────────────────────────────────────────────────────

	it("should set respondedAt when transitioning from PENDING to another status", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			status: "PENDING",
		});
		mockValidateInput.mockReturnValue({
			data: { requestId: "cm1234567890abcdefghijklm", status: "IN_PROGRESS" },
		});

		await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(mockPrisma.customizationRequest.update).toHaveBeenCalledWith({
			where: { id: "cm1234567890abcdefghijklm" },
			data: expect.objectContaining({
				status: "IN_PROGRESS",
				respondedAt: expect.any(Date),
			}),
		});
	});

	it("should NOT set respondedAt when current status is not PENDING", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			status: "IN_PROGRESS",
		});
		mockValidateInput.mockReturnValue({
			data: { requestId: "cm1234567890abcdefghijklm", status: "COMPLETED" },
		});

		await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		const updateCall = mockPrisma.customizationRequest.update.mock.calls[0][0];
		expect(updateCall.data).not.toHaveProperty("respondedAt");
	});

	// ──────────────────────────────────────────────────────────────
	// DB update
	// ──────────────────────────────────────────────────────────────

	it("should update the status in DB", async () => {
		await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(mockPrisma.customizationRequest.update).toHaveBeenCalledWith({
			where: { id: "cm1234567890abcdefghijklm" },
			data: expect.objectContaining({ status: "IN_PROGRESS" }),
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate admin + detail cache tags on success", async () => {
		await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-stats");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-request-cm1234567890abcdefghijklm");
	});

	it("should also invalidate user cache tag when request has a userId", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			userId: "user_abc",
		});

		await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-user-user_abc");
	});

	it("should NOT invalidate user cache tag when request has no userId", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			userId: null,
		});

		await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		const updateTagCalls = mockUpdateTag.mock.calls.map(([tag]: [string]) => tag);
		const hasUserTag = updateTagCalls.some((tag: string) =>
			tag.startsWith("customization-requests-user-")
		);
		expect(hasUserTag).toBe(false);
	});

	// ──────────────────────────────────────────────────────────────
	// Email sending
	// ──────────────────────────────────────────────────────────────

	it("should send status email for IN_PROGRESS status", async () => {
		mockValidateInput.mockReturnValue({
			data: { requestId: "cm1234567890abcdefghijklm", status: "IN_PROGRESS" },
		});

		await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(mockSendCustomizationStatusEmail).toHaveBeenCalledWith(
			expect.objectContaining({ status: "IN_PROGRESS" })
		);
	});

	it("should send status email for COMPLETED status", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			status: "IN_PROGRESS",
		});
		mockValidateInput.mockReturnValue({
			data: { requestId: "cm1234567890abcdefghijklm", status: "COMPLETED" },
		});

		await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(mockSendCustomizationStatusEmail).toHaveBeenCalledWith(
			expect.objectContaining({ status: "COMPLETED" })
		);
	});

	it("should send status email for CANCELLED status", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			status: "IN_PROGRESS",
		});
		mockValidateInput.mockReturnValue({
			data: { requestId: "cm1234567890abcdefghijklm", status: "CANCELLED" },
		});

		await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(mockSendCustomizationStatusEmail).toHaveBeenCalledWith(
			expect.objectContaining({ status: "CANCELLED" })
		);
	});

	it("should NOT send status email for PENDING status", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			status: "CANCELLED",
		});
		mockValidateInput.mockReturnValue({
			data: { requestId: "cm1234567890abcdefghijklm", status: "PENDING" },
		});

		await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(mockSendCustomizationStatusEmail).not.toHaveBeenCalled();
	});

	it("should sanitize PII before sending status email", async () => {
		mockSanitizeForEmail.mockImplementation((str: string) => `sanitized:${str}`);

		await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(mockSendCustomizationStatusEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "sanitized:marie@example.com",
				firstName: "sanitized:Marie",
			})
		);
	});

	it("should include sanitized adminNotes in email when notes exist", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING_REQUEST,
			adminNotes: "Notes de l'admin",
		});
		mockSanitizeForEmail.mockImplementation((str: string) => `sanitized:${str}`);

		await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(mockSendCustomizationStatusEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				adminNotes: "sanitized:Notes de l'admin",
			})
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Success
	// ──────────────────────────────────────────────────────────────

	it("should return success on valid update", async () => {
		const result = await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError when DB update throws", async () => {
		mockPrisma.customizationRequest.update.mockRejectedValue(
			new Error("DB connection failed")
		);

		const result = await updateCustomizationStatus(undefined, VALID_FORM_DATA);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.any(String)
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

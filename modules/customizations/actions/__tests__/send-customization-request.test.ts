import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockGetSession,
	mockCheckRateLimit,
	mockGetClientIp,
	mockGetRateLimitIdentifier,
	mockHeaders,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockSanitizeForEmail,
	mockSendCustomizationRequestEmail,
	mockSendCustomizationConfirmationEmail,
	mockGetCustomizationInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productType: { findFirst: vi.fn() },
		customizationRequest: { create: vi.fn() },
	},
	mockGetSession: vi.fn(),
	mockCheckRateLimit: vi.fn(),
	mockGetClientIp: vi.fn(),
	mockGetRateLimitIdentifier: vi.fn(),
	mockHeaders: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockSanitizeForEmail: vi.fn(),
	mockSendCustomizationRequestEmail: vi.fn(),
	mockSendCustomizationConfirmationEmail: vi.fn(),
	mockGetCustomizationInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/shared/lib/rate-limit", () => ({
	checkRateLimit: mockCheckRateLimit,
	getClientIp: mockGetClientIp,
	getRateLimitIdentifier: mockGetRateLimitIdentifier,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	CUSTOMIZATION_LIMITS: { QUOTE_REQUEST: { limit: 5, windowMs: 3600000 } },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("next/headers", () => ({
	headers: mockHeaders,
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
	sendCustomizationRequestEmail: mockSendCustomizationRequestEmail,
	sendCustomizationConfirmationEmail: mockSendCustomizationConfirmationEmail,
}));

vi.mock("../../constants/cache", () => ({
	getCustomizationInvalidationTags: mockGetCustomizationInvalidationTags,
	CUSTOMIZATION_CACHE_TAGS: {
		LIST: "customization-requests-list",
		STATS: "customization-requests-stats",
		USER_REQUESTS: (userId: string) => `customization-requests-user-${userId}`,
	},
}));

vi.mock("../../schemas/customization.schema", () => ({
	customizationSchema: {},
}));

import { sendCustomizationRequest } from "../send-customization-request";

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
	firstName: "Marie",
	email: "marie@example.com",
	phone: "+33612345678",
	productTypeLabel: "Bague",
	details: "Je souhaite une bague gravée avec le prénom de ma fille",
	rgpdConsent: "true",
	website: "",
});

const VALIDATED_DATA = {
	firstName: "Marie",
	email: "marie@example.com",
	phone: "+33612345678",
	productTypeLabel: "Bague",
	details: "Je souhaite une bague gravée avec le prénom de ma fille",
	rgpdConsent: true,
	website: "",
};

const MOCK_REQUEST = {
	id: "req_cm1234567890abcdef",
};

// ============================================================================
// TESTS
// ============================================================================

describe("sendCustomizationRequest", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: headers and IP
		mockHeaders.mockResolvedValue(new Headers());
		mockGetClientIp.mockResolvedValue("1.2.3.4");
		mockGetRateLimitIdentifier.mockReturnValue("ip:1.2.3.4");

		// Default: IP rate limit passes
		mockCheckRateLimit.mockResolvedValue({ success: true });

		// Default: validation passes
		mockValidateInput.mockReturnValue({ data: { ...VALIDATED_DATA } });

		// Default: no active session (guest)
		mockGetSession.mockResolvedValue(null);

		// Default: no matching product type
		mockPrisma.productType.findFirst.mockResolvedValue(null);

		// Default: DB creates request successfully
		mockPrisma.customizationRequest.create.mockResolvedValue(MOCK_REQUEST);

		// Default: sanitize passes through
		mockSanitizeForEmail.mockImplementation((str: string) => str);

		// Default: emails succeed
		mockSendCustomizationRequestEmail.mockResolvedValue({ success: true });
		mockSendCustomizationConfirmationEmail.mockResolvedValue({ success: true });

		// Default: cache tags
		mockGetCustomizationInvalidationTags.mockReturnValue([
			"customization-requests-list",
			"customization-requests-stats",
			"admin-badges",
		]);

		// Default: response helpers
		mockSuccess.mockImplementation((message: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
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
	// Rate limiting — IP
	// ──────────────────────────────────────────────────────────────

	it("should return error when IP rate limit is exceeded", async () => {
		mockCheckRateLimit.mockResolvedValueOnce({
			success: false,
			error: "Trop de demandes envoyées. Veuillez réessayer plus tard.",
		});

		const result = await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.customizationRequest.create).not.toHaveBeenCalled();
	});

	it("should return the rate limit error message when provided", async () => {
		mockCheckRateLimit.mockResolvedValueOnce({
			success: false,
			error: "Trop de demandes envoyées. Veuillez réessayer plus tard.",
		});

		const result = await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(result.message).toBe("Trop de demandes envoyées. Veuillez réessayer plus tard.");
	});

	it("should return fallback error message when IP rate limit has no error message", async () => {
		mockCheckRateLimit.mockResolvedValueOnce({
			success: false,
			error: undefined,
		});

		const result = await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Trop de demandes");
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid data", async () => {
		const validationError = {
			status: ActionStatus.VALIDATION_ERROR,
			message: "Le prénom est requis",
		};
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(result).toEqual(validationError);
		expect(mockPrisma.customizationRequest.create).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Honeypot
	// ──────────────────────────────────────────────────────────────

	it("should return success silently when honeypot field is filled", async () => {
		mockValidateInput.mockReturnValue({
			data: { ...VALIDATED_DATA, website: "https://spam.com" },
		});

		const result = await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.customizationRequest.create).not.toHaveBeenCalled();
	});

	it("should not write to DB when honeypot is triggered", async () => {
		mockValidateInput.mockReturnValue({
			data: { ...VALIDATED_DATA, website: "  bot  " },
		});

		await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(mockPrisma.customizationRequest.create).not.toHaveBeenCalled();
		expect(mockSendCustomizationRequestEmail).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limiting — email
	// ──────────────────────────────────────────────────────────────

	it("should return error when email rate limit is exceeded", async () => {
		// IP rate limit passes (first call), email rate limit fails (second call)
		mockCheckRateLimit
			.mockResolvedValueOnce({ success: true })
			.mockResolvedValueOnce({ success: false });

		const result = await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("adresse email");
		expect(mockPrisma.customizationRequest.create).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// DB creation
	// ──────────────────────────────────────────────────────────────

	it("should create customizationRequest in DB with correct data", async () => {
		await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(mockPrisma.customizationRequest.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				firstName: "Marie",
				email: "marie@example.com",
				phone: "+33612345678",
				productTypeLabel: "Bague",
				details: "Je souhaite une bague gravée avec le prénom de ma fille",
			}),
		});
	});

	it("should link productTypeId when a matching active product type is found", async () => {
		mockPrisma.productType.findFirst.mockResolvedValue({ id: "type_abc" });

		await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(mockPrisma.customizationRequest.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				productTypeId: "type_abc",
			}),
		});
	});

	it("should set productTypeId to null when no matching product type is found", async () => {
		mockPrisma.productType.findFirst.mockResolvedValue(null);

		await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(mockPrisma.customizationRequest.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				productTypeId: null,
			}),
		});
	});

	it("should link userId when user is logged in", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user_abc" } });

		await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(mockPrisma.customizationRequest.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				userId: "user_abc",
			}),
		});
	});

	it("should set userId to null when no session exists (guest)", async () => {
		mockGetSession.mockResolvedValue(null);

		await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(mockPrisma.customizationRequest.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				userId: null,
			}),
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Email sending
	// ──────────────────────────────────────────────────────────────

	it("should send admin notification email with sanitized data", async () => {
		mockSanitizeForEmail.mockImplementation((str: string) => `sanitized:${str}`);

		await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(mockSendCustomizationRequestEmail).toHaveBeenCalledWith({
			firstName: "sanitized:Marie",
			email: "sanitized:marie@example.com",
			phone: "sanitized:+33612345678",
			productTypeLabel: "sanitized:Bague",
			details: "sanitized:Je souhaite une bague gravée avec le prénom de ma fille",
		});
	});

	it("should send confirmation email to customer", async () => {
		await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(mockSendCustomizationConfirmationEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				email: "marie@example.com",
				firstName: "Marie",
			})
		);
	});

	it("should still succeed when admin email fails", async () => {
		mockSendCustomizationRequestEmail.mockRejectedValue(
			new Error("Email service down")
		);

		const result = await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should still succeed when admin email returns failure result", async () => {
		mockSendCustomizationRequestEmail.mockResolvedValue({
			success: false,
			error: "SMTP error",
		});

		const result = await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate admin cache tags on success", async () => {
		await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-stats");
		expect(mockUpdateTag).toHaveBeenCalledWith("admin-badges");
	});

	it("should also invalidate user cache tag when user is logged in", async () => {
		mockGetSession.mockResolvedValue({ user: { id: "user_abc" } });

		await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-user-user_abc");
	});

	it("should NOT invalidate user cache tag when guest (no session)", async () => {
		mockGetSession.mockResolvedValue(null);

		await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		const updateTagCalls = mockUpdateTag.mock.calls.map(
			([tag]: [string]) => tag
		);
		const hasUserTag = updateTagCalls.some((tag: string) =>
			tag.startsWith("customization-requests-user-")
		);
		expect(hasUserTag).toBe(false);
	});

	// ──────────────────────────────────────────────────────────────
	// Success response
	// ──────────────────────────────────────────────────────────────

	it("should return success with the new request id", async () => {
		const result = await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.any(String),
			{ id: MOCK_REQUEST.id }
		);
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError when DB create throws", async () => {
		mockPrisma.customizationRequest.create.mockRejectedValue(
			new Error("DB connection failed")
		);

		const result = await sendCustomizationRequest(undefined, VALID_FORM_DATA);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.any(String)
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

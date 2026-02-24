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
	mockSanitizeText,
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
	mockSanitizeText: vi.fn(),
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
	sanitizeText: mockSanitizeText,
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

vi.mock("../../schemas/update-notes.schema", () => ({
	updateNotesSchema: {},
}));

import { updateCustomizationNotes } from "../update-customization-notes";

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
	notes: "Notes internes sur la demande",
});

// ============================================================================
// TESTS
// ============================================================================

describe("updateCustomizationNotes", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: admin authenticated
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin_abc" } });

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: validation passes with non-null notes
		mockValidateInput.mockReturnValue({
			data: {
				requestId: "cm1234567890abcdefghijklm",
				notes: "Notes internes sur la demande",
			},
		});

		// Default: request exists
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			id: "cm1234567890abcdefghijklm",
		});

		// Default: update succeeds
		mockPrisma.customizationRequest.update.mockResolvedValue({});

		// Default: sanitizeText passes through
		mockSanitizeText.mockImplementation((str: string) => str);

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

		const result = await updateCustomizationNotes(undefined, VALID_FORM_DATA);

		expect(result).toEqual(authError);
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limit
	// ──────────────────────────────────────────────────────────────

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await updateCustomizationNotes(undefined, VALID_FORM_DATA);

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

		const result = await updateCustomizationNotes(undefined, VALID_FORM_DATA);

		expect(result).toEqual(validationError);
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Not found
	// ──────────────────────────────────────────────────────────────

	it("should return error when request does not exist", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue(null);

		const result = await updateCustomizationNotes(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("non trouvee");
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Sanitization
	// ──────────────────────────────────────────────────────────────

	it("should sanitize notes before persisting", async () => {
		mockSanitizeText.mockReturnValue("Sanitized notes");

		await updateCustomizationNotes(undefined, VALID_FORM_DATA);

		expect(mockSanitizeText).toHaveBeenCalledWith("Notes internes sur la demande");
		expect(mockPrisma.customizationRequest.update).toHaveBeenCalledWith({
			where: { id: "cm1234567890abcdefghijklm" },
			data: { adminNotes: "Sanitized notes" },
		});
	});

	it("should persist null adminNotes when notes value is null after validation", async () => {
		// Schema transforms empty string to null, so validated notes can be null
		mockValidateInput.mockReturnValue({
			data: {
				requestId: "cm1234567890abcdefghijklm",
				notes: null,
			},
		});

		await updateCustomizationNotes(undefined, VALID_FORM_DATA);

		expect(mockSanitizeText).not.toHaveBeenCalled();
		expect(mockPrisma.customizationRequest.update).toHaveBeenCalledWith({
			where: { id: "cm1234567890abcdefghijklm" },
			data: { adminNotes: null },
		});
	});

	// ──────────────────────────────────────────────────────────────
	// DB update
	// ──────────────────────────────────────────────────────────────

	it("should update adminNotes in DB with correct requestId", async () => {
		await updateCustomizationNotes(undefined, VALID_FORM_DATA);

		expect(mockPrisma.customizationRequest.update).toHaveBeenCalledWith({
			where: { id: "cm1234567890abcdefghijklm" },
			data: { adminNotes: "Notes internes sur la demande" },
		});
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate list, stats, and detail cache tags on success", async () => {
		await updateCustomizationNotes(undefined, VALID_FORM_DATA);

		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-stats");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-request-cm1234567890abcdefghijklm");
	});

	// ──────────────────────────────────────────────────────────────
	// Success messages
	// ──────────────────────────────────────────────────────────────

	it("should return 'Notes mises a jour' when notes are set", async () => {
		const result = await updateCustomizationNotes(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Notes mises a jour");
	});

	it("should return 'Notes supprimees' when notes are cleared (null)", async () => {
		mockValidateInput.mockReturnValue({
			data: {
				requestId: "cm1234567890abcdefghijklm",
				notes: null,
			},
		});

		const result = await updateCustomizationNotes(undefined, VALID_FORM_DATA);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith("Notes supprimees");
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError when DB update throws", async () => {
		mockPrisma.customizationRequest.update.mockRejectedValue(
			new Error("DB connection failed")
		);

		const result = await updateCustomizationNotes(undefined, VALID_FORM_DATA);

		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.any(String)
		);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

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
	mockNotFound,
	mockLogAudit,
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
	mockNotFound: vi.fn(),
	mockLogAudit: vi.fn(),
	mockGetCustomizationInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_CUSTOMIZATION_LIMITS: { DELETE: "admin-customization-delete" },
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
	notFound: mockNotFound,
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: mockLogAudit,
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

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
}));

import { deleteCustomizationRequest } from "../delete-customization-request";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(): FormData {
	const formData = new FormData();
	formData.set("requestId", "cm1234567890abcdefghijklm");
	return formData;
}

const MOCK_EXISTING = {
	id: "cm1234567890abcdefghijklm",
	userId: "user_abc",
	firstName: "Marie",
	email: "marie@example.com",
};

// ============================================================================
// TESTS
// ============================================================================

describe("deleteCustomizationRequest", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin_abc", name: "Admin", email: "admin@example.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { requestId: "cm1234567890abcdefghijklm" },
		});
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({ ...MOCK_EXISTING });
		mockPrisma.customizationRequest.update.mockResolvedValue({});
		mockGetCustomizationInvalidationTags.mockReturnValue([
			"customization-requests-list",
			"customization-requests-stats",
			"customization-request-cm1234567890abcdefghijklm",
			"admin-badges",
		]);

		mockSuccess.mockImplementation((message: string) => ({
			status: ActionStatus.SUCCESS,
			message,
		}));
		mockNotFound.mockImplementation((message: string) => ({
			status: ActionStatus.NOT_FOUND,
			message,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// ── Auth ────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});

		const result = await deleteCustomizationRequest(undefined, createFormData());

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ── Rate limit ──────────────────────────────────────────────────

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});

		const result = await deleteCustomizationRequest(undefined, createFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ── Validation ──────────────────────────────────────────────────

	it("should return validation error for invalid input", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "ID invalide" },
		});

		const result = await deleteCustomizationRequest(undefined, createFormData());

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockPrisma.customizationRequest.findFirst).not.toHaveBeenCalled();
	});

	// ── Not found ───────────────────────────────────────────────────

	it("should return notFound when request does not exist", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue(null);

		const result = await deleteCustomizationRequest(undefined, createFormData());

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	it("should respect notDeleted filter (excludes already soft-deleted)", async () => {
		await deleteCustomizationRequest(undefined, createFormData());

		expect(mockPrisma.customizationRequest.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	// ── Soft delete ─────────────────────────────────────────────────

	it("should perform a soft delete (set deletedAt)", async () => {
		await deleteCustomizationRequest(undefined, createFormData());

		expect(mockPrisma.customizationRequest.update).toHaveBeenCalledWith({
			where: { id: "cm1234567890abcdefghijklm" },
			data: { deletedAt: expect.any(Date) },
		});
	});

	// ── Audit ───────────────────────────────────────────────────────

	it("should log audit with email + firstName metadata", async () => {
		await deleteCustomizationRequest(undefined, createFormData());

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				adminId: "admin_abc",
				action: "customization.delete",
				targetType: "customization",
				targetId: "cm1234567890abcdefghijklm",
				metadata: { email: "marie@example.com", firstName: "Marie" },
			}),
		);
	});

	// ── Cache invalidation ──────────────────────────────────────────

	it("should invalidate admin caches with the request ID", async () => {
		await deleteCustomizationRequest(undefined, createFormData());

		expect(mockGetCustomizationInvalidationTags).toHaveBeenCalledWith("cm1234567890abcdefghijklm");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-stats");
	});

	it("should invalidate user cache when request has a userId", async () => {
		await deleteCustomizationRequest(undefined, createFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-user-user_abc");
	});

	it("should NOT invalidate user cache when request has no userId", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING,
			userId: null,
		});

		await deleteCustomizationRequest(undefined, createFormData());

		const tags = mockUpdateTag.mock.calls.map((args: unknown[]) => (args as [string])[0]);
		expect(tags.some((t: string) => t.startsWith("customization-requests-user-"))).toBe(false);
	});

	// ── Success ─────────────────────────────────────────────────────

	it("should return success on valid delete", async () => {
		const result = await deleteCustomizationRequest(undefined, createFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ── Error handling ──────────────────────────────────────────────

	it("should call handleActionError when DB throws", async () => {
		mockPrisma.customizationRequest.update.mockRejectedValue(new Error("DB down"));

		const result = await deleteCustomizationRequest(undefined, createFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

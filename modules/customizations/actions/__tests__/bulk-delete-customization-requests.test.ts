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
	mockLogAudit,
	mockGetCustomizationInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		customizationRequest: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
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
	ADMIN_CUSTOMIZATION_LIMITS: { BULK_DELETE: "admin-customization-bulk-delete" },
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

import { bulkDeleteCustomizationRequests } from "../bulk-delete-customization-requests";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(ids: string[]): FormData {
	const formData = new FormData();
	for (const id of ids) {
		formData.append("requestIds", id);
	}
	return formData;
}

const VALID_IDS = ["cm1234567890abcdefghijkl1", "cm1234567890abcdefghijkl2"];

const MOCK_EXISTING = [
	{ id: "cm1234567890abcdefghijkl1", userId: "user_a" },
	{ id: "cm1234567890abcdefghijkl2", userId: "user_b" },
];

// ============================================================================
// TESTS
// ============================================================================

describe("bulkDeleteCustomizationRequests", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin_abc", name: "Admin", email: "admin@example.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { requestIds: VALID_IDS },
		});
		mockPrisma.customizationRequest.findMany.mockResolvedValue([...MOCK_EXISTING]);
		mockPrisma.customizationRequest.updateMany.mockResolvedValue({ count: 2 });
		mockGetCustomizationInvalidationTags.mockReturnValue([
			"customization-requests-list",
			"customization-requests-stats",
			"admin-badges",
		]);

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

	// ── Auth ────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});

		const result = await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.customizationRequest.updateMany).not.toHaveBeenCalled();
	});

	// ── Rate limit ──────────────────────────────────────────────────

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});

		const result = await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.customizationRequest.updateMany).not.toHaveBeenCalled();
	});

	// ── Validation ──────────────────────────────────────────────────

	it("should return validation error for invalid input", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});

		const result = await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockPrisma.customizationRequest.findMany).not.toHaveBeenCalled();
	});

	it("should pass requestIds array from formData.getAll to validation", async () => {
		await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		expect(mockValidateInput).toHaveBeenCalledWith(expect.any(Object), {
			requestIds: VALID_IDS,
		});
	});

	// ── No requests found ──────────────────────────────────────────

	it("should return error when no matching requests exist", async () => {
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);

		const result = await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.customizationRequest.updateMany).not.toHaveBeenCalled();
	});

	it("should respect notDeleted filter", async () => {
		await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		expect(mockPrisma.customizationRequest.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	// ── Soft delete bulk ───────────────────────────────────────────

	it("should soft delete only the requests that were found (avoiding ghost IDs)", async () => {
		// findMany returns 1 (out of 2 requested) → updateMany should target only that 1
		mockPrisma.customizationRequest.findMany.mockResolvedValue([MOCK_EXISTING[0]]);

		await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		expect(mockPrisma.customizationRequest.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["cm1234567890abcdefghijkl1"] } },
			data: { deletedAt: expect.any(Date) },
		});
	});

	// ── Audit ───────────────────────────────────────────────────────

	it("should log audit with count + IDs concatenated in targetId", async () => {
		await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				adminId: "admin_abc",
				action: "customization.bulkDelete",
				targetType: "customization",
				targetId: "cm1234567890abcdefghijkl1,cm1234567890abcdefghijkl2",
				metadata: { count: 2 },
			}),
		);
	});

	// ── Cache invalidation ──────────────────────────────────────────

	it("should invalidate per-request DETAIL tags", async () => {
		await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		expect(mockUpdateTag).toHaveBeenCalledWith("customization-request-cm1234567890abcdefghijkl1");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-request-cm1234567890abcdefghijkl2");
	});

	it("should invalidate per-user USER_REQUESTS tag (deduplicated via Set)", async () => {
		await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-user-user_a");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-user-user_b");
	});

	it("should deduplicate user tags when multiple requests share the same userId", async () => {
		mockPrisma.customizationRequest.findMany.mockResolvedValue([
			{ id: "id1", userId: "user_a" },
			{ id: "id2", userId: "user_a" },
			{ id: "id3", userId: "user_a" },
		]);

		await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		const tags = mockUpdateTag.mock.calls.map((args: unknown[]) => (args as [string])[0]);
		const userATags = tags.filter((t: string) => t === "customization-requests-user-user_a");
		expect(userATags).toHaveLength(1);
	});

	it("should NOT invalidate user tag when requests have no userId (guests)", async () => {
		mockPrisma.customizationRequest.findMany.mockResolvedValue([
			{ id: "id1", userId: null },
			{ id: "id2", userId: null },
		]);

		await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		const tags = mockUpdateTag.mock.calls.map((args: unknown[]) => (args as [string])[0]);
		expect(tags.some((t: string) => t.startsWith("customization-requests-user-"))).toBe(false);
	});

	// ── Success ─────────────────────────────────────────────────────

	it("should return success with count payload", async () => {
		const result = await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ count: 2 });
	});

	// ── Error handling ──────────────────────────────────────────────

	it("should call handleActionError when DB throws", async () => {
		mockPrisma.customizationRequest.updateMany.mockRejectedValue(new Error("DB down"));

		const result = await bulkDeleteCustomizationRequests(undefined, createFormData(VALID_IDS));

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

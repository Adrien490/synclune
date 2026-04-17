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
	mockNotFound,
	mockLogAudit,
	mockGetCustomizationInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		customizationRequest: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		product: {
			findMany: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockLogAudit: vi.fn(),
	mockGetCustomizationInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/app/generated/prisma/client", () => ({
	ProductStatus: { DRAFT: "DRAFT", PUBLIC: "PUBLIC", ARCHIVED: "ARCHIVED" },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_CUSTOMIZATION_LIMITS: {
		UPDATE_INSPIRATIONS: "admin-customization-update-inspirations",
	},
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
	safeFormGetJSON: <T>(formData: FormData, key: string): T | null => {
		const v = formData.get(key);
		if (typeof v !== "string") return null;
		try {
			return JSON.parse(v) as T;
		} catch {
			return null;
		}
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
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

import { updateCustomizationInspirationProducts } from "../update-customization-inspiration-products";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(productIds: string[] = []): FormData {
	const formData = new FormData();
	formData.set("requestId", "cm1234567890abcdefghijklm");
	formData.set("productIds", JSON.stringify(productIds));
	return formData;
}

const MOCK_EXISTING = {
	id: "cm1234567890abcdefghijklm",
	userId: "user_abc",
	inspirationProducts: [{ id: "old-prod-1" }, { id: "old-prod-2" }],
};

// ============================================================================
// TESTS
// ============================================================================

describe("updateCustomizationInspirationProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin_abc", name: "Admin", email: "admin@example.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: {
				requestId: "cm1234567890abcdefghijklm",
				productIds: ["new-prod-1", "new-prod-2"],
			},
		});
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({ ...MOCK_EXISTING });
		mockPrisma.product.findMany.mockResolvedValue([{ id: "new-prod-1" }, { id: "new-prod-2" }]);
		mockPrisma.customizationRequest.update.mockResolvedValue({});
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

		const result = await updateCustomizationInspirationProducts(
			undefined,
			createFormData(["new-prod-1"]),
		);

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ── Rate limit ──────────────────────────────────────────────────

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Trop de requêtes" },
		});

		const result = await updateCustomizationInspirationProducts(
			undefined,
			createFormData(["new-prod-1"]),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ── Validation ──────────────────────────────────────────────────

	it("should return validation error for invalid input", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});

		const result = await updateCustomizationInspirationProducts(
			undefined,
			createFormData(["new-prod-1"]),
		);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	// ── Not found ───────────────────────────────────────────────────

	it("should return notFound when request does not exist", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue(null);

		const result = await updateCustomizationInspirationProducts(
			undefined,
			createFormData(["new-prod-1"]),
		);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	// ── Product validation ─────────────────────────────────────────

	it("should return error when one or more products are invalid (not PUBLIC or deleted)", async () => {
		// Asked for 2 products but only 1 valid
		mockPrisma.product.findMany.mockResolvedValue([{ id: "new-prod-1" }]);

		const result = await updateCustomizationInspirationProducts(
			undefined,
			createFormData(["new-prod-1", "new-prod-2"]),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("inspirants");
		expect(mockPrisma.customizationRequest.update).not.toHaveBeenCalled();
	});

	it("should filter products by status PUBLIC and notDeleted", async () => {
		await updateCustomizationInspirationProducts(
			undefined,
			createFormData(["new-prod-1", "new-prod-2"]),
		);

		expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
			where: {
				id: { in: ["new-prod-1", "new-prod-2"] },
				status: "PUBLIC",
				deletedAt: null,
			},
			select: { id: true },
		});
	});

	it("should skip product validation when productIds is empty (clearing)", async () => {
		mockValidateInput.mockReturnValue({
			data: { requestId: "cm1234567890abcdefghijklm", productIds: [] },
		});

		await updateCustomizationInspirationProducts(undefined, createFormData([]));

		expect(mockPrisma.product.findMany).not.toHaveBeenCalled();
		expect(mockPrisma.customizationRequest.update).toHaveBeenCalled();
	});

	// ── Mutation ────────────────────────────────────────────────────

	it("should set the inspirationProducts relation with the new IDs", async () => {
		await updateCustomizationInspirationProducts(
			undefined,
			createFormData(["new-prod-1", "new-prod-2"]),
		);

		expect(mockPrisma.customizationRequest.update).toHaveBeenCalledWith({
			where: { id: "cm1234567890abcdefghijklm" },
			data: {
				inspirationProducts: {
					set: [{ id: "new-prod-1" }, { id: "new-prod-2" }],
				},
			},
		});
	});

	it("should clear all inspiration products when given empty array", async () => {
		mockValidateInput.mockReturnValue({
			data: { requestId: "cm1234567890abcdefghijklm", productIds: [] },
		});

		await updateCustomizationInspirationProducts(undefined, createFormData([]));

		expect(mockPrisma.customizationRequest.update).toHaveBeenCalledWith({
			where: { id: "cm1234567890abcdefghijklm" },
			data: { inspirationProducts: { set: [] } },
		});
	});

	// ── Audit ───────────────────────────────────────────────────────

	it("should log audit with added/removed/total metadata", async () => {
		await updateCustomizationInspirationProducts(
			undefined,
			createFormData(["new-prod-1", "new-prod-2"]),
		);

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				adminId: "admin_abc",
				action: "customization.updateInspirations",
				targetType: "customization",
				targetId: "cm1234567890abcdefghijklm",
				metadata: {
					added: ["new-prod-1", "new-prod-2"],
					removed: ["old-prod-1", "old-prod-2"],
					total: 2,
				},
			}),
		);
	});

	it("should compute added/removed correctly when there is overlap", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING,
			inspirationProducts: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
		});
		mockValidateInput.mockReturnValue({
			data: {
				requestId: "cm1234567890abcdefghijklm",
				productIds: ["p2", "p3", "p4"],
			},
		});
		mockPrisma.product.findMany.mockResolvedValue([{ id: "p2" }, { id: "p3" }, { id: "p4" }]);

		await updateCustomizationInspirationProducts(undefined, createFormData(["p2", "p3", "p4"]));

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: { added: ["p4"], removed: ["p1"], total: 3 },
			}),
		);
	});

	// ── Cache invalidation ──────────────────────────────────────────

	it("should invalidate admin + detail + user cache tags", async () => {
		await updateCustomizationInspirationProducts(
			undefined,
			createFormData(["new-prod-1", "new-prod-2"]),
		);

		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-stats");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-request-cm1234567890abcdefghijklm");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-user-user_abc");
	});

	it("should NOT invalidate user cache tag when request has no userId", async () => {
		mockPrisma.customizationRequest.findFirst.mockResolvedValue({
			...MOCK_EXISTING,
			userId: null,
		});

		await updateCustomizationInspirationProducts(
			undefined,
			createFormData(["new-prod-1", "new-prod-2"]),
		);

		const tags = mockUpdateTag.mock.calls.map((args: unknown[]) => (args as [string])[0]);
		expect(tags.some((t: string) => t.startsWith("customization-requests-user-"))).toBe(false);
	});

	// ── Success ─────────────────────────────────────────────────────

	it("should return success on valid update", async () => {
		const result = await updateCustomizationInspirationProducts(
			undefined,
			createFormData(["new-prod-1", "new-prod-2"]),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ── Error handling ──────────────────────────────────────────────

	it("should call handleActionError when DB throws", async () => {
		mockPrisma.customizationRequest.update.mockRejectedValue(new Error("DB down"));

		const result = await updateCustomizationInspirationProducts(
			undefined,
			createFormData(["new-prod-1", "new-prod-2"]),
		);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

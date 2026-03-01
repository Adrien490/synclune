import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockHandleActionError,
	mockCollectBulkInvalidationTags,
	mockInvalidateTags,
	mockSchemaParse,
} = vi.hoisted(() => ({
	mockPrisma: {
		productSku: { updateMany: vi.fn(), findMany: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockCollectBulkInvalidationTags: vi.fn(),
	mockInvalidateTags: vi.fn(),
	mockSchemaParse: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_BULK_OPERATIONS_LIMIT: "sku-bulk" }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	BusinessError: class BusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	},
	handleActionError: mockHandleActionError,
}));
vi.mock("../../schemas/sku.schemas", () => ({
	bulkActivateSkusSchema: { parse: mockSchemaParse },
}));
vi.mock("../../utils/cache.utils", () => ({
	collectBulkInvalidationTags: mockCollectBulkInvalidationTags,
	invalidateTags: mockInvalidateTags,
}));
vi.mock("../../constants/sku.constants", () => ({
	BULK_SKU_LIMITS: { DEFAULT: 100 },
}));

import { bulkActivateSkus } from "../bulk-activate-skus";

// ============================================================================
// HELPERS
// ============================================================================

const validIds = [VALID_CUID, VALID_CUID_2];

function makeFormData(ids: string[]) {
	return createMockFormData({
		ids: JSON.stringify(ids),
	});
}

function createMockSkusData() {
	return [
		{ id: VALID_CUID, sku: "BRC-OR-M", productId: "prod-1", product: { slug: "bracelet-or" } },
		{ id: VALID_CUID_2, sku: "BRC-AR-M", productId: "prod-1", product: { slug: "bracelet-or" } },
	];
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkActivateSkus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCollectBulkInvalidationTags.mockReturnValue(new Set(["skus-list"]));
		mockInvalidateTags.mockReturnValue(undefined);

		mockSchemaParse.mockReturnValue({ ids: validIds });

		mockPrisma.productSku.findMany.mockResolvedValue(createMockSkusData());
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 2 });

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await bulkActivateSkus(undefined, makeFormData(validIds));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await bulkActivateSkus(undefined, makeFormData(validIds));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when no IDs are provided", async () => {
		mockSchemaParse.mockReturnValue({ ids: [] });
		const result = await bulkActivateSkus(undefined, makeFormData([]));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Aucune variante");
	});

	it("should return error when IDs exceed the bulk limit", async () => {
		const manyIds = Array.from({ length: 101 }, (_, i) => `id-${i}`);
		mockSchemaParse.mockReturnValue({ ids: manyIds });
		const result = await bulkActivateSkus(undefined, makeFormData(manyIds));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Maximum 100");
	});

	it("should call findMany to fetch sku data before update", async () => {
		await bulkActivateSkus(undefined, makeFormData(validIds));
		expect(mockPrisma.productSku.findMany).toHaveBeenCalledWith({
			where: { id: { in: validIds } },
			select: expect.objectContaining({
				id: true,
				sku: true,
				productId: true,
			}),
		});
	});

	it("should call updateMany with isActive=true", async () => {
		await bulkActivateSkus(undefined, makeFormData(validIds));
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith({
			where: { id: { in: validIds } },
			data: { isActive: true },
		});
	});

	it("should invalidate cache tags after successful update", async () => {
		await bulkActivateSkus(undefined, makeFormData(validIds));
		expect(mockCollectBulkInvalidationTags).toHaveBeenCalled();
		expect(mockInvalidateTags).toHaveBeenCalled();
	});

	it("should return success with count in message", async () => {
		const result = await bulkActivateSkus(undefined, makeFormData(validIds));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("2");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productSku.findMany.mockRejectedValue(new Error("DB crash"));
		const result = await bulkActivateSkus(undefined, makeFormData(validIds));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should call handleActionError with the correct fallback message", async () => {
		mockPrisma.productSku.updateMany.mockRejectedValue(new Error("DB error"));
		await bulkActivateSkus(undefined, makeFormData(validIds));
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			expect.stringContaining("activer"),
		);
	});

	it("should pass collected tags to invalidateTags", async () => {
		const mockTags = new Set(["skus-list", "product-bracelet-or"]);
		mockCollectBulkInvalidationTags.mockReturnValue(mockTags);
		await bulkActivateSkus(undefined, makeFormData(validIds));
		expect(mockInvalidateTags).toHaveBeenCalledWith(mockTags);
	});
});

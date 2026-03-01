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
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_BULK_OPERATIONS_LIMIT: "sku-bulk" }));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	BusinessError: class BusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	},
	handleActionError: mockHandleActionError,
}));
vi.mock("../../schemas/sku.schemas", () => ({
	bulkDeactivateSkusSchema: { parse: mockSchemaParse },
}));
vi.mock("../../utils/cache.utils", () => ({
	collectBulkInvalidationTags: mockCollectBulkInvalidationTags,
	invalidateTags: mockInvalidateTags,
}));
vi.mock("../../constants/sku.constants", () => ({
	BULK_SKU_LIMITS: { DEFAULT: 100 },
}));

import { bulkDeactivateSkus } from "../bulk-deactivate-skus";

// ============================================================================
// HELPERS
// ============================================================================

const validIds = [VALID_CUID, VALID_CUID_2];

function makeFormData(ids: string[]) {
	return createMockFormData({
		ids: JSON.stringify(ids),
	});
}

function createMockSkusData(overrides: Partial<{ isDefault: boolean }>[] = []) {
	return [
		{
			id: VALID_CUID,
			sku: "BRC-OR-M",
			productId: "prod-1",
			isDefault: overrides[0]?.isDefault ?? false,
			product: { slug: "bracelet-or" },
		},
		{
			id: VALID_CUID_2,
			sku: "BRC-AR-M",
			productId: "prod-1",
			isDefault: overrides[1]?.isDefault ?? false,
			product: { slug: "bracelet-or" },
		},
	];
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkDeactivateSkus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
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
		const result = await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when no IDs are provided", async () => {
		mockSchemaParse.mockReturnValue({ ids: [] });
		const result = await bulkDeactivateSkus(undefined, makeFormData([]));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Aucune variante");
	});

	it("should return error when IDs exceed the bulk limit", async () => {
		const manyIds = Array.from({ length: 101 }, (_, i) => `id-${i}`);
		mockSchemaParse.mockReturnValue({ ids: manyIds });
		const result = await bulkDeactivateSkus(undefined, makeFormData(manyIds));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Maximum 100");
	});

	it("should return error when a default SKU is selected", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue(
			createMockSkusData([{ isDefault: true }, { isDefault: false }]),
		);
		const result = await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("defaut");
	});

	it("should return error when all selected SKUs are default", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue(
			createMockSkusData([{ isDefault: true }, { isDefault: true }]),
		);
		const result = await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("variante par defaut");
	});

	it("should call updateMany with isActive=false when no default SKUs", async () => {
		await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith({
			where: { id: { in: validIds } },
			data: { isActive: false },
		});
	});

	it("should fetch skus including isDefault field", async () => {
		await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(mockPrisma.productSku.findMany).toHaveBeenCalledWith({
			where: { id: { in: validIds } },
			select: expect.objectContaining({
				isDefault: true,
			}),
		});
	});

	it("should invalidate cache tags after successful update", async () => {
		await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(mockCollectBulkInvalidationTags).toHaveBeenCalled();
		expect(mockInvalidateTags).toHaveBeenCalled();
	});

	it("should return success with count in message", async () => {
		const result = await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("2");
	});

	it("should not call updateMany when default SKU check fails", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue(createMockSkusData([{ isDefault: true }]));
		await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(mockPrisma.productSku.updateMany).not.toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productSku.findMany.mockRejectedValue(new Error("DB crash"));
		const result = await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

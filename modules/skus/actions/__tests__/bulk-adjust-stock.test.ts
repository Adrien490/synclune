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
		$transaction: vi.fn(),
		$executeRaw: vi.fn(),
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
	validateInput: (
		schema: {
			safeParse: (data: unknown) => {
				success: boolean;
				data?: unknown;
				error?: { issues: { message: string }[] };
			};
		},
		data: unknown,
	) => {
		const result = schema.safeParse(data);
		if (!result.success) {
			return {
				error: {
					status: "validation_error",
					message: result.error?.issues[0]?.message ?? "Invalid",
				},
			};
		}
		return { data: result.data };
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
	bulkAdjustStockSchema: { safeParse: mockSchemaParse },
}));
vi.mock("../../utils/cache.utils", () => ({
	collectBulkInvalidationTags: mockCollectBulkInvalidationTags,
	invalidateTags: mockInvalidateTags,
}));
vi.mock("../../constants/sku.constants", () => ({
	BULK_SKU_LIMITS: { STOCK_ADJUSTMENT: 50 },
}));

import { bulkAdjustStock } from "../bulk-adjust-stock";

// ============================================================================
// HELPERS
// ============================================================================

const validIds = [VALID_CUID, VALID_CUID_2];

function makeFormData(ids: string[], mode: string, value: string) {
	return createMockFormData({
		ids: JSON.stringify(ids),
		mode,
		value,
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

describe("bulkAdjustStock", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCollectBulkInvalidationTags.mockReturnValue(new Set(["skus-list"]));
		mockInvalidateTags.mockReturnValue(undefined);

		mockSchemaParse.mockReturnValue({
			success: true,
			data: { ids: validIds, mode: "absolute", value: 10 },
		});

		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 2 });
		mockPrisma.productSku.findMany.mockResolvedValue(createMockSkusData());
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.$executeRaw.mockImplementation(() => Promise.resolve(2));

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await bulkAdjustStock(undefined, makeFormData(validIds, "absolute", "10"));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await bulkAdjustStock(undefined, makeFormData(validIds, "absolute", "10"));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when no IDs are provided", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: { ids: [], mode: "absolute", value: 10 },
		});
		const result = await bulkAdjustStock(undefined, makeFormData([], "absolute", "10"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Aucune variante");
	});

	it("should return error when IDs exceed the bulk limit", async () => {
		const manyIds = Array.from({ length: 51 }, (_, i) => `id-${i}`);
		mockSchemaParse.mockReturnValue({
			success: true,
			data: { ids: manyIds, mode: "absolute", value: 10 },
		});
		const result = await bulkAdjustStock(undefined, makeFormData(manyIds, "absolute", "10"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Maximum 50");
	});

	it("should return error when relative adjustment value is 0", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: { ids: validIds, mode: "relative", value: 0 },
		});
		const result = await bulkAdjustStock(undefined, makeFormData(validIds, "relative", "0"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("ne peut pas être 0");
	});

	it("should return error when absolute value is negative", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: { ids: validIds, mode: "absolute", value: -5 },
		});
		const result = await bulkAdjustStock(undefined, makeFormData(validIds, "absolute", "-5"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("négatif");
	});

	it("should call updateMany for absolute mode", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: { ids: validIds, mode: "absolute", value: 10 },
		});
		await bulkAdjustStock(undefined, makeFormData(validIds, "absolute", "10"));
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith({
			where: { id: { in: validIds } },
			data: { inventory: 10 },
		});
	});

	it("should use $executeRaw for positive relative adjustment", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: { ids: validIds, mode: "relative", value: 5 },
		});
		await bulkAdjustStock(undefined, makeFormData(validIds, "relative", "5"));
		expect(mockPrisma.$executeRaw).toHaveBeenCalled();
	});

	it("should use $transaction for negative relative adjustment to prevent negative stock", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: { ids: validIds, mode: "relative", value: -3 },
		});
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
				mockPrisma.$executeRaw.mockImplementation(() => Promise.resolve(2));
				return fn(mockPrisma);
			},
		);
		await bulkAdjustStock(undefined, makeFormData(validIds, "relative", "-3"));
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("should return error when SKUs not found after update", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue([]);
		const result = await bulkAdjustStock(undefined, makeFormData(validIds, "absolute", "10"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Aucune variante trouvée");
	});

	it("should invalidate cache tags after successful update", async () => {
		await bulkAdjustStock(undefined, makeFormData(validIds, "absolute", "10"));
		expect(mockCollectBulkInvalidationTags).toHaveBeenCalled();
		expect(mockInvalidateTags).toHaveBeenCalled();
	});

	it("should return success with count and mode in message for positive relative", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: { ids: validIds, mode: "relative", value: 5 },
		});
		const result = await bulkAdjustStock(undefined, makeFormData(validIds, "relative", "5"));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("+5");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productSku.updateMany.mockRejectedValue(new Error("DB crash"));
		const result = await bulkAdjustStock(undefined, makeFormData(validIds, "absolute", "10"));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

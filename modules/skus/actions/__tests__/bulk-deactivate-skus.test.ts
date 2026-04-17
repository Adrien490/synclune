import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

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
	bulkDeactivateSkusSchema: { safeParse: mockSchemaParse },
}));
vi.mock("../../utils/cache.utils", () => ({
	collectBulkInvalidationTags: mockCollectBulkInvalidationTags,
	invalidateTags: mockInvalidateTags,
}));
vi.mock("../../constants/sku.constants", () => ({
	BULK_SKU_LIMITS: { DEFAULT: 100 },
}));

import { bulkDeactivateSkus } from "../bulk-deactivate-skus";

const validIds = [VALID_CUID, VALID_CUID_2];

function makeFormData(ids: string[]) {
	return createMockFormData({ ids: JSON.stringify(ids) });
}

type SkuOverride = {
	id?: string;
	isDefault?: boolean;
	isActive?: boolean;
	productId?: string;
	productStatus?: string;
	activeSkusCount?: number;
};

function createMockSkusData(overrides: SkuOverride[] = []): Array<{
	id: string;
	sku: string;
	productId: string;
	isDefault: boolean;
	isActive: boolean;
	product: { slug: string; status: string; skus: Array<{ id: string }> };
}> {
	const defaults: SkuOverride[] = [{}, {}];
	const merged = defaults.map((d, i) => ({ ...d, ...(overrides[i] ?? {}) }));
	return merged.map((o, i) => {
		const activeCount = o.activeSkusCount ?? 2;
		return {
			id: o.id ?? (i === 0 ? VALID_CUID : VALID_CUID_2),
			sku: i === 0 ? "BRC-OR-M" : "BRC-AR-M",
			productId: o.productId ?? "prod-1",
			isDefault: o.isDefault ?? false,
			isActive: o.isActive ?? true,
			product: {
				slug: "bracelet-or",
				status: o.productStatus ?? "DRAFT",
				skus: Array.from({ length: activeCount }, (_, k) => ({ id: `active-${k}` })),
			},
		};
	});
}

describe("bulkDeactivateSkus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCollectBulkInvalidationTags.mockReturnValue(new Set(["skus-list"]));
		mockInvalidateTags.mockReturnValue(undefined);

		mockSchemaParse.mockReturnValue({ success: true, data: { ids: validIds } });

		mockPrisma.productSku.findMany.mockResolvedValue(createMockSkusData());
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 2 });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);

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
		mockSchemaParse.mockReturnValue({ success: true, data: { ids: [] } });
		const result = await bulkDeactivateSkus(undefined, makeFormData([]));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Aucune variante");
	});

	it("should return error when IDs exceed the bulk limit", async () => {
		const manyIds = Array.from({ length: 101 }, (_, i) => `id-${i}`);
		mockSchemaParse.mockReturnValue({ success: true, data: { ids: manyIds } });
		const result = await bulkDeactivateSkus(undefined, makeFormData(manyIds));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Maximum 100");
	});

	it("should reject when any selected SKU is default", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue(
			createMockSkusData([{ isDefault: true }, { isDefault: false }]),
		);
		const result = await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should call updateMany with isActive=false when no default SKUs", async () => {
		await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith({
			where: { id: { in: validIds } },
			data: { isActive: false },
		});
	});

	it("should fetch skus including product.status and active skus count", async () => {
		await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(mockPrisma.productSku.findMany).toHaveBeenCalledWith({
			where: { id: { in: validIds } },
			select: expect.objectContaining({
				isDefault: true,
				isActive: true,
				product: expect.objectContaining({
					select: expect.objectContaining({
						status: true,
					}),
				}),
			}),
		});
	});

	it("should wrap read+write in a transaction", async () => {
		await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(mockPrisma.$transaction).toHaveBeenCalled();
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

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ============================================================================
	// PUBLIC PRODUCT GUARD (P1.2)
	// ============================================================================

	it("should reject when deactivating all active SKUs of a PUBLIC product", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue(
			createMockSkusData([
				{ productStatus: "PUBLIC", activeSkusCount: 2, isActive: true },
				{ productStatus: "PUBLIC", activeSkusCount: 2, isActive: true },
			]),
		);
		const result = await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should allow deactivation when PUBLIC product keeps at least 1 active SKU", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue(
			createMockSkusData([
				{ productStatus: "PUBLIC", activeSkusCount: 3, isActive: true },
				{ productStatus: "PUBLIC", activeSkusCount: 3, isActive: true },
			]),
		);
		const result = await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should ignore PUBLIC guard when products are DRAFT", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue(
			createMockSkusData([
				{ productStatus: "DRAFT", activeSkusCount: 1, isActive: true },
				{ productStatus: "DRAFT", activeSkusCount: 1, isActive: true },
			]),
		);
		const result = await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should not count inactive SKUs as affected for PUBLIC guard", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue(
			createMockSkusData([
				{ productStatus: "PUBLIC", activeSkusCount: 2, isActive: false },
				{ productStatus: "PUBLIC", activeSkusCount: 2, isActive: false },
			]),
		);
		const result = await bulkDeactivateSkus(undefined, makeFormData(validIds));
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});
});

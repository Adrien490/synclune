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
		productSku: { update: vi.fn(), findMany: vi.fn() },
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
	bulkUpdatePriceSchema: { safeParse: mockSchemaParse },
}));
vi.mock("../../utils/cache.utils", () => ({
	collectBulkInvalidationTags: mockCollectBulkInvalidationTags,
	invalidateTags: mockInvalidateTags,
}));
vi.mock("../../constants/sku.constants", () => ({
	BULK_SKU_LIMITS: { PRICE_UPDATE: 25 },
}));

import { bulkUpdatePrice } from "../bulk-update-price";

// ============================================================================
// HELPERS
// ============================================================================

const validIds = [VALID_CUID, VALID_CUID_2];

function makeFormData(ids: string[], mode: string, value: string, updateCompareAtPrice = "false") {
	return createMockFormData({
		ids: JSON.stringify(ids),
		mode,
		value,
		updateCompareAtPrice,
	});
}

function createMockSkusData() {
	return [
		{
			id: VALID_CUID,
			sku: "BRC-OR-M",
			productId: "prod-1",
			priceInclTax: 5000,
			compareAtPrice: 6000,
			product: { slug: "bracelet-or" },
		},
		{
			id: VALID_CUID_2,
			sku: "BRC-AR-M",
			productId: "prod-1",
			priceInclTax: 8000,
			compareAtPrice: null,
			product: { slug: "bracelet-argent" },
		},
	];
}

// ============================================================================
// TESTS
// ============================================================================

describe("bulkUpdatePrice", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockCollectBulkInvalidationTags.mockReturnValue(new Set(["skus-list"]));
		mockInvalidateTags.mockReturnValue(undefined);

		mockSchemaParse.mockReturnValue({
			success: true,
			data: {
				ids: validIds,
				mode: "absolute",
				value: 4500,
				updateCompareAtPrice: false,
			},
		});

		mockPrisma.productSku.findMany.mockResolvedValue(createMockSkusData());
		mockPrisma.productSku.update.mockResolvedValue({});
		mockPrisma.$transaction.mockImplementation(async (ops: unknown) => {
			if (typeof ops === "function") {
				return (ops as (tx: typeof mockPrisma) => Promise<unknown>)(mockPrisma);
			}
			return Promise.all(ops as Promise<unknown>[]);
		});

		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await bulkUpdatePrice(undefined, makeFormData(validIds, "absolute", "4500"));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await bulkUpdatePrice(undefined, makeFormData(validIds, "absolute", "4500"));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return error when no IDs are provided", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: {
				ids: [],
				mode: "absolute",
				value: 4500,
				updateCompareAtPrice: false,
			},
		});
		const result = await bulkUpdatePrice(undefined, makeFormData([], "absolute", "4500"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Aucune variante");
	});

	it("should return error when IDs exceed the price update limit", async () => {
		const manyIds = Array.from({ length: 26 }, (_, i) => `id-${i}`);
		mockSchemaParse.mockReturnValue({
			success: true,
			data: {
				ids: manyIds,
				mode: "absolute",
				value: 4500,
				updateCompareAtPrice: false,
			},
		});
		const result = await bulkUpdatePrice(undefined, makeFormData(manyIds, "absolute", "4500"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Maximum 25");
	});

	it("should return error when percentage mode has value 0", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: {
				ids: validIds,
				mode: "percentage",
				value: 0,
				updateCompareAtPrice: false,
			},
		});
		const result = await bulkUpdatePrice(undefined, makeFormData(validIds, "percentage", "0"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("0");
	});

	it("should return error when absolute mode has negative value", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: {
				ids: validIds,
				mode: "absolute",
				value: -100,
				updateCompareAtPrice: false,
			},
		});
		const result = await bulkUpdatePrice(undefined, makeFormData(validIds, "absolute", "-100"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("négatif");
	});

	it("should return error when no SKUs are found in DB", async () => {
		mockPrisma.productSku.findMany.mockResolvedValue([]);
		const result = await bulkUpdatePrice(undefined, makeFormData(validIds, "absolute", "4500"));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Aucune variante trouvée");
	});

	it("should return error when calculated price exceeds maximum", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: {
				ids: validIds,
				mode: "absolute",
				value: 100000000,
				updateCompareAtPrice: false,
			},
		});
		const result = await bulkUpdatePrice(
			undefined,
			makeFormData(validIds, "absolute", "100000000"),
		);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("999999.99 EUR");
	});

	it("should use absolute price directly in absolute mode", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: {
				ids: validIds,
				mode: "absolute",
				value: 4500,
				updateCompareAtPrice: false,
			},
		});
		await bulkUpdatePrice(undefined, makeFormData(validIds, "absolute", "4500"));
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ priceInclTax: 4500 }),
			}),
		);
	});

	it("should apply percentage to current price in percentage mode", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: {
				ids: validIds,
				mode: "percentage",
				value: 10,
				updateCompareAtPrice: false,
			},
		});
		await bulkUpdatePrice(undefined, makeFormData(validIds, "percentage", "10"));
		// First SKU: 5000 * 1.1 = 5500
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_CUID },
				data: expect.objectContaining({ priceInclTax: 5500 }),
			}),
		);
	});

	it("should apply same ratio to compareAtPrice when updateCompareAtPrice=true in absolute mode", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: {
				ids: validIds,
				mode: "absolute",
				value: 4500,
				updateCompareAtPrice: true,
			},
		});
		await bulkUpdatePrice(undefined, makeFormData(validIds, "absolute", "4500", "true"));
		// First SKU has compareAtPrice=6000, absolute mode sets it to same new price
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_CUID },
				data: expect.objectContaining({ priceInclTax: 4500, compareAtPrice: 4500 }),
			}),
		);
	});

	it("should apply percentage ratio to compareAtPrice when updateCompareAtPrice=true in percentage mode", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: {
				ids: validIds,
				mode: "percentage",
				value: 10,
				updateCompareAtPrice: true,
			},
		});
		await bulkUpdatePrice(undefined, makeFormData(validIds, "percentage", "10", "true"));
		// First SKU compareAtPrice=6000 * 1.1 = 6600
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_CUID },
				data: expect.objectContaining({ compareAtPrice: 6600 }),
			}),
		);
	});

	it("should use $transaction to apply per-SKU updates", async () => {
		await bulkUpdatePrice(undefined, makeFormData(validIds, "absolute", "4500"));
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("should invalidate cache tags after successful update", async () => {
		await bulkUpdatePrice(undefined, makeFormData(validIds, "absolute", "4500"));
		expect(mockCollectBulkInvalidationTags).toHaveBeenCalled();
		expect(mockInvalidateTags).toHaveBeenCalled();
	});

	it("should return success with mode label in message for absolute mode", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: {
				ids: validIds,
				mode: "absolute",
				value: 4500,
				updateCompareAtPrice: false,
			},
		});
		const result = await bulkUpdatePrice(undefined, makeFormData(validIds, "absolute", "4500"));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("45.00 EUR");
	});

	it("should return success with percentage label in message for percentage mode", async () => {
		mockSchemaParse.mockReturnValue({
			success: true,
			data: {
				ids: validIds,
				mode: "percentage",
				value: 10,
				updateCompareAtPrice: false,
			},
		});
		const result = await bulkUpdatePrice(undefined, makeFormData(validIds, "percentage", "10"));
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("+10%");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await bulkUpdatePrice(undefined, makeFormData(validIds, "absolute", "4500"));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

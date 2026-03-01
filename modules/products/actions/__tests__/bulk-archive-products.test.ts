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
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockNotFound,
	mockValidationError,
	mockGetProductInvalidationTags,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findMany: vi.fn(), updateMany: vi.fn() },
		productSku: { updateMany: vi.fn() },
		orderItem: { count: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockValidationError: vi.fn(),
	mockGetProductInvalidationTags: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_BULK_ARCHIVE_LIMIT: "admin-product-bulk-archive",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	notFound: mockNotFound,
	validationError: mockValidationError,
}));
vi.mock("../../schemas/product.schemas", () => ({ bulkArchiveProductsSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));

import { bulkArchiveProducts } from "../bulk-archive-products";

// ============================================================================
// HELPERS
// ============================================================================

const productIds = [VALID_CUID, VALID_CUID_2];

const validFormData = createMockFormData({
	productIds: JSON.stringify(productIds),
	targetStatus: "ARCHIVED",
});

const validatedData = {
	productIds,
	targetStatus: "ARCHIVED",
};

const existingProducts = [
	{
		id: VALID_CUID,
		title: "Bracelet Lune",
		slug: "bracelet-lune",
		status: "PUBLIC",
		collections: [{ collection: { slug: "bijoux" } }],
	},
	{
		id: VALID_CUID_2,
		title: "Collier Etoile",
		slug: "collier-etoile",
		status: "PUBLIC",
		collections: [{ collection: { slug: "bijoux" } }],
	},
];

// ============================================================================
// TESTS
// ============================================================================

describe("bulkArchiveProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });
		mockGetProductInvalidationTags.mockReturnValue(["products-list"]);
		mockGetCollectionInvalidationTags.mockReturnValue(["collections-list"]);

		mockPrisma.product.findMany.mockResolvedValue(existingProducts);
		mockPrisma.product.updateMany.mockResolvedValue({ count: 2 });
		mockPrisma.orderItem.count.mockResolvedValue(0);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 2 });

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
		}));
		mockValidationError.mockImplementation((msg: string) => ({
			status: ActionStatus.VALIDATION_ERROR,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });
		const result = await bulkArchiveProducts(undefined, validFormData);
		expect(result).toEqual(authError);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await bulkArchiveProducts(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid JSON in productIds", async () => {
		const badFormData = createMockFormData({ productIds: "not-json", targetStatus: "ARCHIVED" });
		const result = await bulkArchiveProducts(undefined, badFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return validation error when Zod schema fails", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "IDs requis" };
		mockValidateInput.mockReturnValue({ error: valErr });
		const result = await bulkArchiveProducts(undefined, validFormData);
		expect(result).toEqual(valErr);
	});

	it("should return not found when some products do not exist", async () => {
		mockPrisma.product.findMany.mockResolvedValue([existingProducts[0]]);
		const result = await bulkArchiveProducts(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should run transaction when archiving products", async () => {
		await bulkArchiveProducts(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
	});

	it("should deactivate SKUs in transaction when archiving", async () => {
		await bulkArchiveProducts(undefined, validFormData);
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: { isActive: false } }),
		);
	});

	it("should not deactivate SKUs when unarchiving (DRAFT target)", async () => {
		mockValidateInput.mockReturnValue({ data: { productIds, targetStatus: "DRAFT" } });
		const unarchiveFormData = createMockFormData({
			productIds: JSON.stringify(productIds),
			targetStatus: "DRAFT",
		});
		await bulkArchiveProducts(undefined, unarchiveFormData);
		expect(mockPrisma.productSku.updateMany).not.toHaveBeenCalled();
	});

	it("should include warning message when products have associated orders", async () => {
		mockPrisma.orderItem.count.mockResolvedValue(3);
		await bulkArchiveProducts(undefined, validFormData);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("commande"),
			expect.objectContaining({ warning: expect.any(String) }),
		);
	});

	it("should not check order items when unarchiving", async () => {
		mockValidateInput.mockReturnValue({ data: { productIds, targetStatus: "DRAFT" } });
		const unarchiveFormData = createMockFormData({
			productIds: JSON.stringify(productIds),
			targetStatus: "DRAFT",
		});
		await bulkArchiveProducts(undefined, unarchiveFormData);
		expect(mockPrisma.orderItem.count).not.toHaveBeenCalled();
	});

	it("should invalidate product cache tags after archiving", async () => {
		await bulkArchiveProducts(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
		expect(mockGetProductInvalidationTags).toHaveBeenCalledTimes(existingProducts.length);
	});

	it("should invalidate deduplicated collection cache tags", async () => {
		await bulkArchiveProducts(undefined, validFormData);
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("bijoux");
		// Both products share "bijoux" collection — should only be called once
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledTimes(1);
	});

	it("should return success with product data on archive", async () => {
		const result = await bulkArchiveProducts(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ count: 2, targetStatus: "ARCHIVED" }),
		);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.product.findMany.mockRejectedValue(new Error("DB crash"));
		const result = await bulkArchiveProducts(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

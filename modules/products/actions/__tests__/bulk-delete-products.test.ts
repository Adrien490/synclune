import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2, VALID_USER_ID } from "@/test/factories";

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
	mockValidationError,
	mockGetProductInvalidationTags,
	mockGetCollectionInvalidationTags,
	mockGetCartInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findMany: vi.fn(), updateMany: vi.fn() },
		productSku: { updateMany: vi.fn() },
		orderItem: { count: vi.fn() },
		cartItem: { findMany: vi.fn(), deleteMany: vi.fn() },
		wishlistItem: { deleteMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockValidationError: vi.fn(),
	mockGetProductInvalidationTags: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
	mockGetCartInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_BULK_DELETE_LIMIT: "admin-product-bulk-delete",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
	validationError: mockValidationError,
}));
vi.mock("../../schemas/product.schemas", () => ({ bulkDeleteProductsSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));
vi.mock("@/modules/cart/constants/cache", () => ({
	getCartInvalidationTags: mockGetCartInvalidationTags,
}));

import { bulkDeleteProducts } from "../bulk-delete-products";

// ============================================================================
// HELPERS
// ============================================================================

const productIds = [VALID_CUID, VALID_CUID_2];

const validFormData = createMockFormData({
	productIds: JSON.stringify(productIds),
});

const validatedData = { productIds };

const existingProducts = [
	{
		id: VALID_CUID,
		title: "Bracelet Lune",
		slug: "bracelet-lune",
		collections: [{ collection: { slug: "bijoux" } }],
	},
	{
		id: VALID_CUID_2,
		title: "Collier Etoile",
		slug: "collier-etoile",
		collections: [],
	},
];

// ============================================================================
// TESTS
// ============================================================================

describe("bulkDeleteProducts", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });
		mockGetProductInvalidationTags.mockReturnValue(["products-list"]);
		mockGetCollectionInvalidationTags.mockReturnValue(["collections-list"]);
		mockGetCartInvalidationTags.mockReturnValue([]);

		mockPrisma.product.findMany.mockResolvedValue(existingProducts);
		mockPrisma.product.updateMany.mockResolvedValue({ count: 2 });
		mockPrisma.orderItem.count.mockResolvedValue(0);
		mockPrisma.cartItem.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.cartItem.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 2 });

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
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
		const result = await bulkDeleteProducts(undefined, validFormData);
		expect(result).toEqual(authError);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await bulkDeleteProducts(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid JSON in productIds", async () => {
		const badFormData = createMockFormData({ productIds: "not-valid-json" });
		const result = await bulkDeleteProducts(undefined, badFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return validation error when productIds is not an array", async () => {
		const badFormData = createMockFormData({ productIds: JSON.stringify({ id: VALID_CUID }) });
		const result = await bulkDeleteProducts(undefined, badFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return validation error when Zod schema fails", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Liste invalide" };
		mockValidateInput.mockReturnValue({ error: valErr });
		const result = await bulkDeleteProducts(undefined, validFormData);
		expect(result).toEqual(valErr);
	});

	it("should return not found when some products do not exist", async () => {
		mockPrisma.product.findMany.mockResolvedValue([existingProducts[0]]);
		const result = await bulkDeleteProducts(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when products have associated order items", async () => {
		mockPrisma.orderItem.count.mockResolvedValue(5);
		const result = await bulkDeleteProducts(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("commande");
	});

	it("should find affected carts before running transaction", async () => {
		mockPrisma.cartItem.findMany.mockResolvedValue([
			{ cart: { userId: VALID_USER_ID, sessionId: null } },
		]);
		await bulkDeleteProducts(undefined, validFormData);
		expect(mockPrisma.cartItem.findMany).toHaveBeenCalled();
	});

	it("should soft delete products and SKUs in a transaction", async () => {
		await bulkDeleteProducts(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
		expect(mockPrisma.cartItem.deleteMany).toHaveBeenCalled();
		expect(mockPrisma.wishlistItem.deleteMany).toHaveBeenCalled();
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
		);
	});

	it("should invalidate cart caches for affected users", async () => {
		mockGetCartInvalidationTags.mockReturnValue(["cart-user-123"]);
		mockPrisma.cartItem.findMany.mockResolvedValue([
			{ cart: { userId: VALID_USER_ID, sessionId: null } },
		]);
		await bulkDeleteProducts(undefined, validFormData);
		expect(mockGetCartInvalidationTags).toHaveBeenCalledWith(VALID_USER_ID, undefined);
		expect(mockUpdateTag).toHaveBeenCalledWith("cart-user-123");
	});

	it("should invalidate product and collection cache tags", async () => {
		await bulkDeleteProducts(undefined, validFormData);
		expect(mockGetProductInvalidationTags).toHaveBeenCalledTimes(existingProducts.length);
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("bijoux");
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should return success with deleted count", async () => {
		const result = await bulkDeleteProducts(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ deletedCount: existingProducts.length }),
		);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.product.findMany.mockRejectedValue(new Error("DB crash"));
		const result = await bulkDeleteProducts(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

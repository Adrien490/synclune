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
	mockGetProductInvalidationTags,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findUnique: vi.fn() },
		collection: { findMany: vi.fn() },
		productCollection: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockGetProductInvalidationTags: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_UPDATE_COLLECTIONS_LIMIT: "admin-product-update-collections",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	safeFormGetJSON: (formData: FormData, key: string) => {
		const v = formData.get(key);
		if (typeof v !== "string" || !v) return null;
		try {
			return JSON.parse(v);
		} catch {
			return null;
		}
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	notFound: mockNotFound,
}));
vi.mock("../../schemas/product.schemas", () => ({ updateProductCollectionsSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));

import { updateProductCollections } from "../update-product-collections";

// ============================================================================
// HELPERS
// ============================================================================

const COL_ID_1 = VALID_CUID;
const COL_ID_2 = VALID_CUID_2;
const PRODUCT_ID = "prod_cm1234567890abcde";

const validFormData = createMockFormData({
	productId: PRODUCT_ID,
	collectionIds: JSON.stringify([COL_ID_1, COL_ID_2]),
});

const mockProduct = {
	id: PRODUCT_ID,
	title: "Bracelet Lune",
	slug: "bracelet-lune",
};

// ============================================================================
// TESTS
// ============================================================================

describe("updateProductCollections", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { productId: PRODUCT_ID, collectionIds: [COL_ID_1, COL_ID_2] },
		});
		mockGetProductInvalidationTags.mockReturnValue(["products-list", "product-bracelet-lune"]);
		mockGetCollectionInvalidationTags.mockReturnValue(["collection-bijoux"]);

		mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
		mockPrisma.collection.findMany.mockResolvedValue([
			{ id: COL_ID_1, slug: "bijoux" },
			{ id: COL_ID_2, slug: "colliers" },
		]);
		mockPrisma.productCollection.findMany.mockResolvedValue([
			{ collection: { slug: "ancienne-collection" } },
		]);
		mockPrisma.productCollection.deleteMany.mockResolvedValue({ count: 1 });
		mockPrisma.productCollection.createMany.mockResolvedValue({ count: 2 });
		mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, { count: 2 }]);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockNotFound.mockImplementation((msg: string) => ({
			status: ActionStatus.NOT_FOUND,
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
		const result = await updateProductCollections(undefined, validFormData);
		expect(result).toEqual(authError);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await updateProductCollections(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "productId requis" };
		mockValidateInput.mockReturnValue({ error: valErr });
		const result = await updateProductCollections(undefined, validFormData);
		expect(result).toEqual(valErr);
	});

	it("should handle malformed JSON collectionIds gracefully", async () => {
		const badFormData = createMockFormData({
			productId: PRODUCT_ID,
			collectionIds: "not-json{{{",
		});
		// With invalid JSON, collectionIds falls back to []
		mockValidateInput.mockReturnValue({
			data: { productId: PRODUCT_ID, collectionIds: [] },
		});
		const result = await updateProductCollections(undefined, badFormData);
		// Should still succeed (empty removal)
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should return not found when product does not exist", async () => {
		mockPrisma.product.findUnique.mockResolvedValue(null);
		mockNotFound.mockReturnValue({ status: ActionStatus.NOT_FOUND, message: "Produit non trouve" });
		const result = await updateProductCollections(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return not found when some collections do not exist", async () => {
		// Only 1 found but 2 requested
		mockPrisma.collection.findMany.mockResolvedValue([{ id: COL_ID_1 }]);
		mockNotFound.mockReturnValue({
			status: ActionStatus.NOT_FOUND,
			message: "Collections introuvables",
		});
		const result = await updateProductCollections(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should succeed when adding collections to product", async () => {
		const result = await updateProductCollections(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.$transaction).toHaveBeenCalled();
	});

	it("should succeed when removing all collections (empty array)", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: PRODUCT_ID, collectionIds: [] },
		});
		const result = await updateProductCollections(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("retiré"));
	});

	it("should skip collection existence check when collectionIds is empty", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: PRODUCT_ID, collectionIds: [] },
		});
		await updateProductCollections(undefined, validFormData);
		expect(mockPrisma.collection.findMany).not.toHaveBeenCalled();
	});

	it("should invalidate old collection cache tags", async () => {
		await updateProductCollections(undefined, validFormData);
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("ancienne-collection");
	});

	it("should invalidate new collection cache tags after update", async () => {
		await updateProductCollections(undefined, validFormData);
		// Called for old + new collections
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledTimes(3); // 1 old + 2 new
	});

	it("should invalidate product cache tags", async () => {
		await updateProductCollections(undefined, validFormData);
		expect(mockGetProductInvalidationTags).toHaveBeenCalledWith("bracelet-lune", PRODUCT_ID);
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await updateProductCollections(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockHandleActionError).toHaveBeenCalled();
	});
});

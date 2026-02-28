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
	mockValidateInput,
	mockSuccess,
	mockNotFound,
	mockHandleActionError,
	mockUpdateTag,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productCollection: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLLECTION_LIMITS: {
		DELETE: "col-delete",
		UPDATE: "col-update",
		BULK_DELETE: "col-bulk-delete",
	},
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	notFound: mockNotFound,
}));
vi.mock("../../schemas/collection.schemas", () => ({ setFeaturedProductSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));

import { setFeaturedProduct, removeFeaturedProduct } from "../set-featured-product";

// ============================================================================
// HELPERS
// ============================================================================

const COLLECTION_ID = VALID_CUID;
const PRODUCT_ID = VALID_CUID_2;

const validFormData = createMockFormData({
	collectionId: COLLECTION_ID,
	productId: PRODUCT_ID,
});

function makeProductCollection(overrides: Record<string, unknown> = {}) {
	return {
		collectionId: COLLECTION_ID,
		productId: PRODUCT_ID,
		isFeatured: false,
		collection: { slug: "bague-soleil", name: "Bague Soleil" },
		product: { title: "Bracelet Lune" },
		...overrides,
	};
}

// ============================================================================
// setFeaturedProduct
// ============================================================================

describe("setFeaturedProduct", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { collectionId: COLLECTION_ID, productId: PRODUCT_ID },
		});
		mockGetCollectionInvalidationTags.mockReturnValue([
			"collections-list",
			"collection-bague-soleil",
		]);
		mockPrisma.productCollection.findUnique.mockResolvedValue(makeProductCollection());
		mockPrisma.$transaction.mockResolvedValue([{ count: 1 }, {}]);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// ---------- Auth ----------

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" },
		});
		const result = await setFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// ---------- Rate limit ----------

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await setFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should enforce rate limit with UPDATE limit key", async () => {
		await setFeaturedProduct(undefined, validFormData);
		expect(mockEnforceRateLimit).toHaveBeenCalledWith("col-update");
	});

	// ---------- Validation ----------

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await setFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// ---------- Not found ----------

	it("should return not_found when ProductCollection does not exist", async () => {
		mockPrisma.productCollection.findUnique.mockResolvedValue(null);
		const result = await setFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should query ProductCollection via composite key", async () => {
		await setFeaturedProduct(undefined, validFormData);
		expect(mockPrisma.productCollection.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					productId_collectionId: {
						productId: PRODUCT_ID,
						collectionId: COLLECTION_ID,
					},
				},
			}),
		);
	});

	// ---------- Success ----------

	it("should succeed and return message with product and collection names", async () => {
		const result = await setFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Bracelet Lune");
		expect(result.message).toContain("Bague Soleil");
	});

	it("should pass an array of two operations to $transaction", async () => {
		await setFeaturedProduct(undefined, validFormData);
		const arg = mockPrisma.$transaction.mock.calls[0]![0];
		expect(Array.isArray(arg)).toBe(true);
		expect(arg).toHaveLength(2);
	});

	it("should call updateMany to clear existing featured before setting new one", async () => {
		await setFeaturedProduct(undefined, validFormData);
		expect(mockPrisma.productCollection.updateMany).toHaveBeenCalledWith({
			where: { collectionId: COLLECTION_ID, isFeatured: true },
			data: { isFeatured: false },
		});
	});

	it("should call update to set the new featured product", async () => {
		await setFeaturedProduct(undefined, validFormData);
		expect(mockPrisma.productCollection.update).toHaveBeenCalledWith({
			where: {
				productId_collectionId: {
					productId: PRODUCT_ID,
					collectionId: COLLECTION_ID,
				},
			},
			data: { isFeatured: true },
		});
	});

	// ---------- Cache invalidation ----------

	it("should call getCollectionInvalidationTags with the collection slug", async () => {
		await setFeaturedProduct(undefined, validFormData);
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("bague-soleil");
	});

	it("should invalidate each collection cache tag", async () => {
		mockGetCollectionInvalidationTags.mockReturnValue([
			"collections-list",
			"collection-bague-soleil",
		]);
		await setFeaturedProduct(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("collections-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("collection-bague-soleil");
	});

	// ---------- Error handling ----------

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await setFeaturedProduct(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should pass the correct fallback message to handleActionError", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		await setFeaturedProduct(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Impossible de définir le produit vedette",
		);
	});
});

// ============================================================================
// removeFeaturedProduct
// ============================================================================

describe("removeFeaturedProduct", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { collectionId: COLLECTION_ID, productId: PRODUCT_ID },
		});
		mockGetCollectionInvalidationTags.mockReturnValue([
			"collections-list",
			"collection-bague-soleil",
		]);
		mockPrisma.productCollection.findUnique.mockResolvedValue(
			makeProductCollection({ isFeatured: true }),
		);
		mockPrisma.productCollection.update.mockResolvedValue({});

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// ---------- Auth ----------

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" },
		});
		const result = await removeFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
		expect(mockPrisma.productCollection.update).not.toHaveBeenCalled();
	});

	// ---------- Rate limit ----------

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await removeFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockPrisma.productCollection.update).not.toHaveBeenCalled();
	});

	it("should enforce rate limit with UPDATE limit key", async () => {
		await removeFeaturedProduct(undefined, validFormData);
		expect(mockEnforceRateLimit).toHaveBeenCalledWith("col-update");
	});

	// ---------- Validation ----------

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await removeFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockPrisma.productCollection.update).not.toHaveBeenCalled();
	});

	// ---------- Not found ----------

	it("should return not_found when ProductCollection does not exist", async () => {
		mockPrisma.productCollection.findUnique.mockResolvedValue(null);
		const result = await removeFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.productCollection.update).not.toHaveBeenCalled();
	});

	// ---------- Success ----------

	it("should succeed and return message with product and collection names", async () => {
		const result = await removeFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Bracelet Lune");
		expect(result.message).toContain("Bague Soleil");
	});

	it("should update isFeatured to false via simple update (no transaction)", async () => {
		await removeFeaturedProduct(undefined, validFormData);
		expect(mockPrisma.productCollection.update).toHaveBeenCalledWith({
			where: {
				productId_collectionId: {
					productId: PRODUCT_ID,
					collectionId: COLLECTION_ID,
				},
			},
			data: { isFeatured: false },
		});
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// ---------- Cache invalidation ----------

	it("should call getCollectionInvalidationTags with the collection slug", async () => {
		await removeFeaturedProduct(undefined, validFormData);
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("bague-soleil");
	});

	it("should invalidate each collection cache tag", async () => {
		mockGetCollectionInvalidationTags.mockReturnValue([
			"collections-list",
			"collection-bague-soleil",
		]);
		await removeFeaturedProduct(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalledWith("collections-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("collection-bague-soleil");
	});

	// ---------- Error handling ----------

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productCollection.update.mockRejectedValue(new Error("DB crash"));
		const result = await removeFeaturedProduct(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should pass the correct fallback message to handleActionError", async () => {
		mockPrisma.productCollection.update.mockRejectedValue(new Error("DB crash"));
		await removeFeaturedProduct(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalledWith(
			expect.any(Error),
			"Impossible de retirer le produit vedette",
		);
	});
});

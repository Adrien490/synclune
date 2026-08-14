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
	mockError,
	mockNotFound,
	mockHandleActionError,
	mockUpdateTag,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productCollection: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
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
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
}));
vi.mock("../../schemas/collection.schemas", () => ({ setFeaturedProductSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));

import { setFeaturedProduct } from "../set-featured-product";

// ============================================================================
// HELPERS
// ============================================================================

const COLLECTION_ID = VALID_CUID;
const PRODUCT_ID = VALID_CUID_2;

const validFormData = createMockFormData({
	collectionId: COLLECTION_ID,
	productId: PRODUCT_ID,
});

// Depuis l'audit schéma V5 (lot A3), la vedette est le rang 0 de
// (position asc, addedAt desc) : plus de booléen `isFeatured` sur l'association.
function makeProductCollection(overrides: Record<string, unknown> = {}) {
	return {
		collectionId: COLLECTION_ID,
		productId: PRODUCT_ID,
		position: 2,
		collection: { slug: "bague-soleil", name: "Bague Soleil" },
		product: { title: "Bracelet Lune", status: "PUBLIC", deletedAt: null },
		...overrides,
	};
}

// ============================================================================
// setFeaturedProduct
// ============================================================================

describe("setFeaturedProduct", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { collectionId: COLLECTION_ID, productId: PRODUCT_ID },
		});
		mockGetCollectionInvalidationTags.mockReturnValue([
			"collections-list",
			"collection-bague-soleil",
		]);
		mockPrisma.productCollection.findUnique.mockResolvedValue(makeProductCollection());
		// La renumérotation relit les associations sœurs sous transaction
		mockPrisma.productCollection.findMany.mockResolvedValue([]);
		// Transaction interactive : exécuter le callback avec le mock prisma comme tx
		// pour que les spies findMany/update se déclenchent.
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
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

	// ---------- Published guard ----------

	it("should reject a soft-deleted product without opening a transaction", async () => {
		mockPrisma.productCollection.findUnique.mockResolvedValue(
			makeProductCollection({
				product: { title: "Bracelet Lune", status: "PUBLIC", deletedAt: new Date() },
			}),
		);
		const result = await setFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(
			"Seul un produit publié (et non supprimé) peut être mis en avant dans une collection.",
		);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should reject a non-PUBLIC product without opening a transaction", async () => {
		mockPrisma.productCollection.findUnique.mockResolvedValue(
			makeProductCollection({
				product: { title: "Bracelet Lune", status: "DRAFT", deletedAt: null },
			}),
		);
		const result = await setFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe(
			"Seul un produit publié (et non supprimé) peut être mis en avant dans une collection.",
		);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// ---------- Success ----------

	it("should succeed and return message with product and collection names", async () => {
		const result = await setFeaturedProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("Bracelet Lune");
		expect(result.message).toContain("Bague Soleil");
	});

	it("should pass an interactive callback to $transaction", async () => {
		await setFeaturedProduct(undefined, validFormData);
		const args = mockPrisma.$transaction.mock.calls[0]!;
		expect(typeof args[0]).toBe("function");
	});

	// ---------- Renumbering ----------

	it("should read the sibling associations in canonical order inside the transaction", async () => {
		await setFeaturedProduct(undefined, validFormData);
		expect(mockPrisma.productCollection.findMany).toHaveBeenCalledWith({
			where: { collectionId: COLLECTION_ID, NOT: { productId: PRODUCT_ID } },
			orderBy: [{ position: "asc" }, { addedAt: "desc" }],
			select: { productId: true },
		});
	});

	it("should move the target association to rank 0", async () => {
		await setFeaturedProduct(undefined, validFormData);
		expect(mockPrisma.productCollection.update).toHaveBeenCalledWith({
			where: {
				productId_collectionId: {
					productId: PRODUCT_ID,
					collectionId: COLLECTION_ID,
				},
			},
			data: { position: 0 },
		});
	});

	it("should renumber siblings from rank 1 while preserving their relative order", async () => {
		mockPrisma.productCollection.findMany.mockResolvedValue([
			{ productId: "sibling-a" },
			{ productId: "sibling-b" },
		]);
		await setFeaturedProduct(undefined, validFormData);
		expect(mockPrisma.productCollection.update).toHaveBeenCalledWith({
			where: {
				productId_collectionId: { productId: "sibling-a", collectionId: COLLECTION_ID },
			},
			data: { position: 1 },
		});
		expect(mockPrisma.productCollection.update).toHaveBeenCalledWith({
			where: {
				productId_collectionId: { productId: "sibling-b", collectionId: COLLECTION_ID },
			},
			data: { position: 2 },
		});
	});

	it("should not touch siblings when the collection has a single product", async () => {
		mockPrisma.productCollection.findMany.mockResolvedValue([]);
		await setFeaturedProduct(undefined, validFormData);
		// Une seule écriture : la cible passe au rang 0
		expect(mockPrisma.productCollection.update).toHaveBeenCalledTimes(1);
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

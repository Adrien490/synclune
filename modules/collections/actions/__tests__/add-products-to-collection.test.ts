import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockUpdateTag,
	mockGetCollectionInvalidationTags,
	mockGetProductInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		collection: { findUnique: vi.fn() },
		product: { findMany: vi.fn() },
		productCollection: { createMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
	mockGetProductInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: vi.fn() }));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_COLLECTION_LIMITS: { MANAGE_PRODUCTS: "col-manage-products" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	safeFormGetJSON: (formData: FormData, key: string) => {
		const v = formData.get(key);
		if (typeof v !== "string") return null;
		try {
			return JSON.parse(v) as unknown;
		} catch {
			return null;
		}
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: (message: string, data?: unknown) => ({ status: ActionStatus.SUCCESS, message, data }),
	notFound: (entity: string) => ({
		status: ActionStatus.NOT_FOUND,
		message: `${entity} introuvable`,
	}),
}));
vi.mock("@/modules/products/utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("../../utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));
vi.mock("../../schemas/collection.schemas", () => ({ addProductsToCollectionSchema: {} }));

import { addProductsToCollection } from "../add-products-to-collection";

const PRODUCT_IDS = [VALID_CUID_2, "cm2222222222aaaaaaaaaaaaa"];

function makeFormData(collectionId: string = VALID_CUID, productIds: string[] = PRODUCT_IDS) {
	return createMockFormData({
		collectionId,
		productIds: JSON.stringify(productIds),
	});
}

describe("addProductsToCollection", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "a@b.c" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockImplementation((_s: unknown, d: unknown) => ({ data: d }));
		mockHandleActionError.mockImplementation((_e: unknown, msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockGetCollectionInvalidationTags.mockReturnValue(["collections-list"]);
		mockGetProductInvalidationTags.mockReturnValue(["products-list"]);

		mockPrisma.collection.findUnique.mockResolvedValue({
			id: VALID_CUID,
			name: "Ma Collection",
			slug: "ma-collection",
		});
		mockPrisma.product.findMany.mockResolvedValue([
			{ id: PRODUCT_IDS[0], slug: "prod-1" },
			{ id: PRODUCT_IDS[1], slug: "prod-2" },
		]);
		mockPrisma.productCollection.createMany.mockResolvedValue({ count: 2 });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
	});

	it("should return auth error", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await addProductsToCollection(undefined, makeFormData());

		expect(result).toEqual(authError);
	});

	it("should return rate limit error", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requetes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await addProductsToCollection(undefined, makeFormData());

		expect(result).toEqual(rateLimitError);
	});

	it("should return validation error", async () => {
		const validationError = { status: ActionStatus.VALIDATION_ERROR, message: "invalid" };
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await addProductsToCollection(undefined, makeFormData());

		expect(result).toEqual(validationError);
	});

	it("should return notFound when collection missing", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionId: VALID_CUID, productIds: PRODUCT_IDS },
		});
		mockPrisma.collection.findUnique.mockResolvedValue(null);

		const result = await addProductsToCollection(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.productCollection.createMany).not.toHaveBeenCalled();
	});

	it("should return notFound when products missing", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionId: VALID_CUID, productIds: PRODUCT_IDS },
		});
		mockPrisma.product.findMany.mockResolvedValue([{ id: PRODUCT_IDS[0], slug: "prod-1" }]);

		const result = await addProductsToCollection(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockPrisma.productCollection.createMany).not.toHaveBeenCalled();
	});

	it("should create associations with skipDuplicates", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionId: VALID_CUID, productIds: PRODUCT_IDS },
		});

		await addProductsToCollection(undefined, makeFormData());

		expect(mockPrisma.productCollection.createMany).toHaveBeenCalledWith({
			data: [
				{ productId: PRODUCT_IDS[0], collectionId: VALID_CUID, isFeatured: false },
				{ productId: PRODUCT_IDS[1], collectionId: VALID_CUID, isFeatured: false },
			],
			skipDuplicates: true,
		});
	});

	it("should return success with addedCount", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionId: VALID_CUID, productIds: PRODUCT_IDS },
		});

		const result = await addProductsToCollection(undefined, makeFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect((result as { data: { addedCount: number } }).data.addedCount).toBe(2);
	});

	it("should include skipped count in message when some are duplicates", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionId: VALID_CUID, productIds: PRODUCT_IDS },
		});
		mockPrisma.productCollection.createMany.mockResolvedValue({ count: 1 });

		const result = await addProductsToCollection(undefined, makeFormData());

		expect(result.message).toContain("déjà présent");
	});

	it("should invalidate collection and product caches", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionId: VALID_CUID, productIds: PRODUCT_IDS },
		});

		await addProductsToCollection(undefined, makeFormData());

		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("ma-collection");
		expect(mockGetProductInvalidationTags).toHaveBeenCalledWith("prod-1", PRODUCT_IDS[0]);
		expect(mockGetProductInvalidationTags).toHaveBeenCalledWith("prod-2", PRODUCT_IDS[1]);
	});

	it("should handle unexpected errors", async () => {
		mockValidateInput.mockReturnValue({
			data: { collectionId: VALID_CUID, productIds: PRODUCT_IDS },
		});
		mockPrisma.collection.findUnique.mockRejectedValue(new Error("DB crash"));

		const result = await addProductsToCollection(undefined, makeFormData());

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

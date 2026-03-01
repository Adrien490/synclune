import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

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
	mockGenerateSlug,
	mockDetectMediaType,
	mockSanitizeText,
	mockGetProductInvalidationTags,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findUnique: vi.fn(), update: vi.fn() },
		productSku: { findFirst: vi.fn(), update: vi.fn() },
		productCollection: { deleteMany: vi.fn(), createMany: vi.fn() },
		skuMedia: { deleteMany: vi.fn(), create: vi.fn() },
		productType: { findUnique: vi.fn() },
		collection: { findMany: vi.fn() },
		color: { findUnique: vi.fn() },
		material: { findUnique: vi.fn() },
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
	mockGenerateSlug: vi.fn(),
	mockDetectMediaType: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockGetProductInvalidationTags: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_UPDATE_LIMIT: "admin-product-update",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	notFound: mockNotFound,
	validationError: mockValidationError,
}));
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }));
vi.mock("@/modules/media/utils/media-type-detection", () => ({
	detectMediaType: mockDetectMediaType,
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("../../schemas/product.schemas", () => ({ updateProductSchema: {} }));
vi.mock("../../constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		SKU_STOCK: (skuId: string) => `sku-stock-${skuId}`,
	},
}));
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));
vi.mock("uploadthing/server", () => ({
	UTApi: vi.fn().mockImplementation(() => ({ deleteFiles: vi.fn() })),
}));

import { updateProduct } from "../update-product";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	productId: VALID_CUID,
	title: "Bracelet Lune Updated",
	description: "Updated description",
	typeId: "type_123",
	collectionIds: JSON.stringify(["col_1"]),
	status: "PUBLIC",
	"defaultSku.skuId": "sku_1",
	"defaultSku.priceInclTaxEuros": "59.99",
	"defaultSku.inventory": "15",
});

const validatedData = {
	productId: VALID_CUID,
	title: "Bracelet Lune Updated",
	description: "Updated description",
	typeId: "type_123",
	collectionIds: ["col_1"],
	status: "PUBLIC",
	defaultSku: {
		skuId: "sku_1",
		priceInclTaxEuros: 59.99,
		compareAtPriceEuros: undefined,
		inventory: 15,
		isActive: true,
		colorId: "",
		materialId: "",
		size: "",
		media: [],
	},
};

// ============================================================================
// TESTS
// ============================================================================

describe("updateProduct", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ success: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockGenerateSlug.mockReturnValue("bracelet-lune-updated");
		mockDetectMediaType.mockReturnValue("IMAGE");
		mockGetProductInvalidationTags.mockReturnValue(["products-list"]);
		mockGetCollectionInvalidationTags.mockReturnValue([]);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.product.findUnique.mockResolvedValue({
			id: VALID_CUID,
			slug: "bracelet-lune",
			status: "PUBLIC",
			collections: [{ collectionId: "col_1", collection: { slug: "col-slug" } }],
			_count: { skus: 1 },
		});
		mockPrisma.productSku.findFirst.mockResolvedValue({ id: "sku_1" });
		mockPrisma.product.update.mockResolvedValue({
			id: VALID_CUID,
			title: "Bracelet Lune Updated",
			slug: "bracelet-lune",
			description: "Updated description",
			status: "PUBLIC",
			typeId: "type_123",
			updatedAt: new Date(),
		});
		mockPrisma.productSku.update.mockResolvedValue({});
		mockPrisma.productCollection.deleteMany.mockResolvedValue({});
		mockPrisma.productCollection.createMany.mockResolvedValue({ count: 1 });
		mockPrisma.skuMedia.deleteMany.mockResolvedValue({});
		mockPrisma.skuMedia.create.mockResolvedValue({});
		mockPrisma.productType.findUnique.mockResolvedValue({ id: "type_123", isActive: true });
		mockPrisma.collection.findMany.mockResolvedValue([{ id: "col_1", slug: "col-1" }]);
		mockPrisma.color.findUnique.mockResolvedValue(null);
		mockPrisma.material.findUnique.mockResolvedValue(null);

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
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await updateProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await updateProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await updateProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when product not found", async () => {
		mockPrisma.product.findUnique.mockResolvedValue(null);
		const result = await updateProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when SKU not found", async () => {
		mockPrisma.productSku.findFirst.mockResolvedValue(null);
		const result = await updateProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should use transaction for update", async () => {
		await updateProduct(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
	});

	it("should invalidate cache after successful update", async () => {
		await updateProduct(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should succeed with valid data", async () => {
		const result = await updateProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await updateProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

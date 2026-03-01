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
	mockGenerateSlug,
	mockGenerateSkuCode,
	mockGetProductForDuplication,
	mockGetProductInvalidationTags,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { create: vi.fn() },
		productCollection: { createMany: vi.fn() },
		productSku: { create: vi.fn() },
		skuMedia: { create: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockGenerateSlug: vi.fn(),
	mockGenerateSkuCode: vi.fn(),
	mockGetProductForDuplication: vi.fn(),
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
	ADMIN_PRODUCT_DUPLICATE_LIMIT: "admin-product-duplicate",
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
	notFound: mockNotFound,
}));
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }));
vi.mock("@/modules/skus/services/sku-generation.service", () => ({
	generateSkuCode: mockGenerateSkuCode,
}));
vi.mock("../../data/get-product-for-duplication", () => ({
	getProductForDuplication: mockGetProductForDuplication,
}));
vi.mock("../../schemas/product.schemas", () => ({ duplicateProductSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));

import { duplicateProduct } from "../duplicate-product";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ productId: VALID_CUID });

const validatedData = { productId: VALID_CUID };

const sourceProduct = {
	id: VALID_CUID,
	title: "Bracelet Lune",
	slug: "bracelet-lune",
	description: "Un bracelet artisanal inspire par la lune",
	typeId: "type_123",
	collections: [
		{
			collectionId: "col_1",
			collection: { slug: "bijoux" },
		},
	],
	skus: [
		{
			sku: "BRC-LUNE-OR-M",
			priceInclTax: 4999,
			compareAtPrice: null,
			inventory: 10,
			isActive: true,
			isDefault: true,
			colorId: "color_1",
			materialId: "mat_1",
			size: "M",
			images: [
				{
					url: "https://utfs.io/f/img.jpg",
					thumbnailUrl: "https://utfs.io/f/thumb.jpg",
					altText: "Bracelet Lune",
					mediaType: "IMAGE",
					isPrimary: true,
					position: 0,
				},
			],
		},
	],
};

const duplicatedProductResult = {
	id: VALID_CUID_2,
	title: "Copie de Bracelet Lune",
	slug: "copie-de-bracelet-lune",
	description: sourceProduct.description,
	status: "DRAFT",
	typeId: "type_123",
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-01-01"),
};

// ============================================================================
// TESTS
// ============================================================================

describe("duplicateProduct", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });
		mockGetProductForDuplication.mockResolvedValue(sourceProduct);
		mockGenerateSlug.mockResolvedValue("copie-de-bracelet-lune");
		mockGenerateSkuCode.mockReturnValue("NEW-SKU-001");
		mockGetProductInvalidationTags.mockReturnValue(["products-list"]);
		mockGetCollectionInvalidationTags.mockReturnValue(["collections-list"]);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.product.create.mockResolvedValue(duplicatedProductResult);
		mockPrisma.productCollection.createMany.mockResolvedValue({ count: 1 });
		mockPrisma.productSku.create.mockResolvedValue({ id: "new-sku-1" });
		mockPrisma.skuMedia.create.mockResolvedValue({ id: "new-media-1" });

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
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

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorise" };
		mockRequireAdmin.mockResolvedValue({ error: authError });
		const result = await duplicateProduct(undefined, validFormData);
		expect(result).toEqual(authError);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await duplicateProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error when Zod schema fails", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "ID requis" };
		mockValidateInput.mockReturnValue({ error: valErr });
		const result = await duplicateProduct(undefined, validFormData);
		expect(result).toEqual(valErr);
	});

	it("should return not found when source product does not exist", async () => {
		mockGetProductForDuplication.mockResolvedValue(null);
		const result = await duplicateProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should generate title as 'Copie de [original title]'", async () => {
		await duplicateProduct(undefined, validFormData);
		expect(mockGenerateSlug).toHaveBeenCalledWith(mockPrisma, "product", "Copie de Bracelet Lune");
	});

	it("should create duplicated product in DRAFT status inside transaction", async () => {
		await duplicateProduct(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
		expect(mockPrisma.product.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: "DRAFT", title: "Copie de Bracelet Lune" }),
			}),
		);
	});

	it("should duplicate collection associations", async () => {
		await duplicateProduct(undefined, validFormData);
		expect(mockPrisma.productCollection.createMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.arrayContaining([expect.objectContaining({ collectionId: "col_1" })]),
			}),
		);
	});

	it("should generate a new SKU code for each duplicated SKU", async () => {
		await duplicateProduct(undefined, validFormData);
		expect(mockGenerateSkuCode).toHaveBeenCalledTimes(sourceProduct.skus.length);
	});

	it("should create new SKU with generated code in transaction", async () => {
		await duplicateProduct(undefined, validFormData);
		expect(mockPrisma.productSku.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ sku: "NEW-SKU-001" }),
			}),
		);
	});

	it("should duplicate SKU images in transaction", async () => {
		await duplicateProduct(undefined, validFormData);
		expect(mockPrisma.skuMedia.create).toHaveBeenCalledTimes(
			sourceProduct.skus.reduce((acc, s) => acc + s.images.length, 0),
		);
	});

	it("should not call productCollection.createMany when source has no collections", async () => {
		mockGetProductForDuplication.mockResolvedValue({ ...sourceProduct, collections: [] });
		await duplicateProduct(undefined, validFormData);
		expect(mockPrisma.productCollection.createMany).not.toHaveBeenCalled();
	});

	it("should invalidate product and collection cache tags after duplication", async () => {
		await duplicateProduct(undefined, validFormData);
		expect(mockGetProductInvalidationTags).toHaveBeenCalledWith(
			duplicatedProductResult.slug,
			duplicatedProductResult.id,
		);
		expect(mockGetCollectionInvalidationTags).toHaveBeenCalledWith("bijoux");
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should return success with new product id, title and slug", async () => {
		const result = await duplicateProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			expect.stringContaining("Copie de Bracelet Lune"),
			expect.objectContaining({
				productId: duplicatedProductResult.id,
				slug: duplicatedProductResult.slug,
			}),
		);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await duplicateProduct(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

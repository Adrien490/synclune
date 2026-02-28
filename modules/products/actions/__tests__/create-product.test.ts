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
	mockError,
	mockValidationError,
	mockGenerateSlug,
	mockDetectMediaType,
	mockSanitizeText,
	mockValidatePublicProduct,
	mockGetProductInvalidationTags,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { create: vi.fn() },
		productCollection: { createMany: vi.fn() },
		productSku: { create: vi.fn() },
		skuMedia: { create: vi.fn() },
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
	mockError: vi.fn(),
	mockValidationError: vi.fn(),
	mockGenerateSlug: vi.fn(),
	mockDetectMediaType: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockValidatePublicProduct: vi.fn(),
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
	ADMIN_PRODUCT_CREATE_LIMIT: "admin-product-create",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	validationError: mockValidationError,
}));
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: mockGenerateSlug }));
vi.mock("@/modules/media/utils/media-type-detection", () => ({
	detectMediaType: mockDetectMediaType,
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("../../services/product-validation.service", () => ({
	validatePublicProductCreation: mockValidatePublicProduct,
}));
vi.mock("../../schemas/product.schemas", () => ({ createProductSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));

import { createProduct } from "../create-product";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({
	title: "Bracelet Lune",
	description: "Description test",
	typeId: "type_123",
	collectionIds: JSON.stringify(["col_1"]),
	status: "PUBLIC",
	"initialSku.sku": "BRC-LUNE-01",
	"initialSku.priceInclTaxEuros": "49.99",
	"initialSku.inventory": "10",
	"initialSku.isActive": "true",
	"initialSku.isDefault": "true",
	"initialSku.colorId": "color_1",
	"initialSku.materialId": "mat_1",
	"initialSku.media": JSON.stringify([{ url: "https://utfs.io/f/img.jpg", position: 0 }]),
});

const validatedData = {
	title: "Bracelet Lune",
	description: "Description test",
	typeId: "type_123",
	collectionIds: ["col_1"],
	status: "PUBLIC",
	initialSku: {
		sku: "BRC-LUNE-01",
		priceInclTaxEuros: 49.99,
		compareAtPriceEuros: undefined,
		inventory: 10,
		isActive: true,
		isDefault: true,
		colorId: "color_1",
		materialId: "mat_1",
		size: "",
		media: [{ url: "https://utfs.io/f/img.jpg", position: 0 }],
	},
};

// ============================================================================
// TESTS
// ============================================================================

describe("createProduct", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.com" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { ...validatedData } });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockGenerateSlug.mockReturnValue("bracelet-lune");
		mockDetectMediaType.mockReturnValue("IMAGE");
		mockValidatePublicProduct.mockReturnValue({ isValid: true });
		mockGetProductInvalidationTags.mockReturnValue(["products-list"]);
		mockGetCollectionInvalidationTags.mockReturnValue([]);

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.productType.findUnique.mockResolvedValue({ id: "type_123", isActive: true });
		mockPrisma.collection.findMany.mockResolvedValue([{ id: "col_1", slug: "col-1" }]);
		mockPrisma.color.findUnique.mockResolvedValue({ id: "color_1" });
		mockPrisma.material.findUnique.mockResolvedValue({ id: "mat_1" });
		mockPrisma.product.create.mockResolvedValue({
			id: VALID_CUID,
			title: "Bracelet Lune",
			slug: "bracelet-lune",
			status: "PUBLIC",
		});
		mockPrisma.productCollection.createMany.mockResolvedValue({ count: 1 });
		mockPrisma.productSku.create.mockResolvedValue({ id: "sku_1" });
		mockPrisma.skuMedia.create.mockResolvedValue({ id: "media_1" });

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
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
		const result = await createProduct(undefined, validFormData);
		expect(result).toEqual(authError);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await createProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		const valErr = { status: ActionStatus.VALIDATION_ERROR, message: "Titre requis" };
		mockValidateInput.mockReturnValue({ error: valErr });
		const result = await createProduct(undefined, validFormData);
		expect(result).toEqual(valErr);
	});

	it("should validate public product needs active SKU", async () => {
		mockValidatePublicProduct.mockReturnValue({ isValid: false, errorMessage: "SKU actif requis" });
		const result = await createProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should allow DRAFT product without active SKU", async () => {
		mockValidateInput.mockReturnValue({
			data: { ...validatedData, status: "DRAFT" },
		});
		const result = await createProduct(undefined, validFormData);
		expect(mockValidatePublicProduct).not.toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should generate slug from title", async () => {
		await createProduct(undefined, validFormData);
		expect(mockGenerateSlug).toHaveBeenCalled();
	});

	it("should use transaction for creation", async () => {
		await createProduct(undefined, validFormData);
		expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
	});

	it("should validate type exists in transaction", async () => {
		mockPrisma.productType.findUnique.mockResolvedValue(null);
		const result = await createProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should invalidate cache after successful creation", async () => {
		await createProduct(undefined, validFormData);
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should handle unique constraint error", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("Unique constraint"));
		const result = await createProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("technique");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await createProduct(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

/**
 * Regression tests for updateProduct hardening (audit catalogue 2026-05-28).
 *
 * @regression cat-audit-001 — status=PUBLIC doit passer validateProductForPublication
 * @regression cat-audit-003 — désactiver le SKU défaut bloqué (alignement update-sku-status)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockValidationError,
	mockNotFound,
	mockSanitizeText,
	mockDetectMediaType,
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
		color: { findMany: vi.fn() },
		material: { findMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockValidationError: vi.fn(),
	mockNotFound: vi.fn(),
	mockSanitizeText: vi.fn(),
	mockDetectMediaType: vi.fn(),
	mockGetProductInvalidationTags: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_UPDATE_LIMIT: "admin-product-update",
}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	safeFormGetJSON: (formData: FormData, key: string) => {
		const v = formData.get(key);
		if (typeof v !== "string") return null;
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
	validationError: mockValidationError,
}));
vi.mock("@/shared/utils/generate-slug", () => ({ generateSlug: vi.fn() }));
vi.mock("@/modules/media/utils/media-type-detection", () => ({
	detectMediaType: mockDetectMediaType,
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: mockSanitizeText }));
vi.mock("../../schemas/product.schemas", () => ({ updateProductSchema: {} }));
vi.mock("../../constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: { SKU_STOCK: (id: string) => `sku-stock-${id}` },
}));
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));
vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: vi.fn().mockResolvedValue({ deleted: 0, failed: 0 }),
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { updateProduct } from "../update-product";

// ============================================================================
// Helpers
// ============================================================================

const formData = createMockFormData({
	productId: VALID_CUID,
	title: "Bracelet Lune Updated",
	description: "Updated",
	typeId: "type_123",
	collectionIds: JSON.stringify([]),
	status: "PUBLIC",
	"defaultSku.skuId": "sku_default",
	"defaultSku.priceInclTaxEuros": "59.99",
	"defaultSku.inventory": "15",
});

function buildValidatedData(overrides: {
	status?: "DRAFT" | "PUBLIC" | "ARCHIVED";
	defaultSkuOverrides?: Partial<{
		isActive: boolean;
		inventory: number;
		media: Array<{ url: string; mediaType: "IMAGE" | "VIDEO" }>;
	}>;
}) {
	return {
		productId: VALID_CUID,
		title: "Bracelet Lune Updated",
		description: "Updated",
		typeId: "type_123",
		collectionIds: [],
		status: overrides.status ?? "PUBLIC",
		defaultSku: {
			skuId: "sku_default",
			priceInclTaxEuros: 59.99,
			compareAtPriceEuros: undefined,
			inventory: overrides.defaultSkuOverrides?.inventory ?? 15,
			isActive: overrides.defaultSkuOverrides?.isActive ?? true,
			colorIds: [],
			materialIds: [],
			size: "",
			media: overrides.defaultSkuOverrides?.media ?? [
				{ url: "https://utfs.io/f/test.webp", mediaType: "IMAGE" as const },
			],
		},
	};
}

function buildProductMock(
	skus: Array<{
		id: string;
		isActive: boolean;
		inventory: number;
		images: Array<{ id: string }>;
	}>,
) {
	return {
		id: VALID_CUID,
		title: "Bracelet Lune Updated",
		slug: "bracelet-lune",
		status: "DRAFT",
		collections: [],
		skus,
	};
}

// ============================================================================
// Common beforeEach
// ============================================================================

describe("updateProduct — regression hardening", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockSanitizeText.mockImplementation((t: string) => t);
		mockDetectMediaType.mockReturnValue("IMAGE");
		mockGetProductInvalidationTags.mockReturnValue(["products-list"]);
		mockGetCollectionInvalidationTags.mockReturnValue([]);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.productType.findUnique.mockResolvedValue({ id: "type_123", isActive: true });
		mockPrisma.collection.findMany.mockResolvedValue([]);
		mockPrisma.color.findMany.mockResolvedValue([]);
		mockPrisma.material.findMany.mockResolvedValue([]);
		mockPrisma.product.update.mockResolvedValue({
			id: VALID_CUID,
			title: "Bracelet Lune Updated",
			slug: "bracelet-lune",
			description: "Updated",
			status: "PUBLIC",
			typeId: "type_123",
			updatedAt: new Date(),
		});
		mockPrisma.productSku.update.mockResolvedValue({});
		mockPrisma.productCollection.deleteMany.mockResolvedValue({});
		mockPrisma.productCollection.createMany.mockResolvedValue({ count: 0 });
		mockPrisma.skuMedia.deleteMany.mockResolvedValue({});
		mockPrisma.skuMedia.create.mockResolvedValue({});

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

	// ===================================================================
	// CAT-AUDIT-001 — validation publication
	// ===================================================================

	describe("CAT-AUDIT-001: validateProductForPublication on status=PUBLIC", () => {
		it("rejects status=PUBLIC when projected inventory of default SKU is 0 and no other SKU has stock", async () => {
			mockValidateInput.mockReturnValue({
				data: buildValidatedData({
					status: "PUBLIC",
					defaultSkuOverrides: { inventory: 0 },
				}),
			});
			mockPrisma.product.findUnique.mockResolvedValue(
				buildProductMock([
					{ id: "sku_default", isActive: true, inventory: 10, images: [{ id: "img1" }] },
				]),
			);
			mockPrisma.productSku.findFirst.mockResolvedValue({
				id: "sku_default",
				isDefault: true,
				isActive: true,
			});

			const result = await updateProduct(undefined, formData);

			expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
			expect(result.message).toContain("stock");
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});

		it("accepts status=PUBLIC when default SKU has stock + image + isActive=true", async () => {
			mockValidateInput.mockReturnValue({ data: buildValidatedData({ status: "PUBLIC" }) });
			mockPrisma.product.findUnique.mockResolvedValue(
				buildProductMock([
					{ id: "sku_default", isActive: true, inventory: 10, images: [{ id: "img1" }] },
				]),
			);
			mockPrisma.productSku.findFirst.mockResolvedValue({
				id: "sku_default",
				isDefault: true,
				isActive: true,
			});

			const result = await updateProduct(undefined, formData);
			expect(result.status).toBe(ActionStatus.SUCCESS);
		});

		it("accepts status=DRAFT even with no stock (DRAFT n'exige pas publication-ready)", async () => {
			mockValidateInput.mockReturnValue({
				data: buildValidatedData({
					status: "DRAFT",
					defaultSkuOverrides: { inventory: 0, isActive: false },
				}),
			});
			mockPrisma.product.findUnique.mockResolvedValue(
				buildProductMock([
					{ id: "sku_default", isActive: false, inventory: 0, images: [{ id: "img1" }] },
				]),
			);
			mockPrisma.productSku.findFirst.mockResolvedValue({
				id: "sku_default",
				isDefault: false, // pas default → on peut desactiver librement
				isActive: false,
			});

			const result = await updateProduct(undefined, formData);
			expect(result.status).toBe(ActionStatus.SUCCESS);
		});

		it("rejects status=PUBLIC when the default SKU's projected isActive=false leaves no other active SKU with stock", async () => {
			mockValidateInput.mockReturnValue({
				data: buildValidatedData({
					status: "PUBLIC",
					defaultSkuOverrides: { isActive: false },
				}),
			});
			// Other SKU exists mais sans stock
			mockPrisma.product.findUnique.mockResolvedValue(
				buildProductMock([
					{ id: "sku_default", isActive: true, inventory: 10, images: [{ id: "img1" }] },
					{ id: "sku_other", isActive: true, inventory: 0, images: [{ id: "img2" }] },
				]),
			);
			// Pour atteindre la validation publication, le defaultSku ne doit pas etre defaut
			// (sinon CAT-AUDIT-003 bloque avant)
			mockPrisma.productSku.findFirst.mockResolvedValue({
				id: "sku_default",
				isDefault: false,
				isActive: true,
			});

			const result = await updateProduct(undefined, formData);
			expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		});
	});

	// ===================================================================
	// CAT-AUDIT-003 — refus désactivation du SKU défaut
	// ===================================================================

	describe("CAT-AUDIT-003: blocking deactivation of default SKU", () => {
		it("rejects when default SKU isActive transitions from true to false", async () => {
			mockValidateInput.mockReturnValue({
				data: buildValidatedData({ defaultSkuOverrides: { isActive: false } }),
			});
			mockPrisma.product.findUnique.mockResolvedValue(
				buildProductMock([
					{ id: "sku_default", isActive: true, inventory: 10, images: [{ id: "img1" }] },
					{ id: "sku_other", isActive: true, inventory: 5, images: [{ id: "img2" }] },
				]),
			);
			mockPrisma.productSku.findFirst.mockResolvedValue({
				id: "sku_default",
				isDefault: true,
				isActive: true,
			});

			const result = await updateProduct(undefined, formData);

			expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
			expect(result.message).toContain("principale");
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		});

		it("accepts when non-default SKU is deactivated (default reste actif)", async () => {
			mockValidateInput.mockReturnValue({
				data: buildValidatedData({
					status: "DRAFT",
					defaultSkuOverrides: { isActive: false },
				}),
			});
			mockPrisma.product.findUnique.mockResolvedValue(
				buildProductMock([
					{ id: "sku_default", isActive: true, inventory: 10, images: [{ id: "img1" }] },
				]),
			);
			mockPrisma.productSku.findFirst.mockResolvedValue({
				id: "sku_default",
				isDefault: false, // pas default
				isActive: true,
			});

			const result = await updateProduct(undefined, formData);
			expect(result.status).toBe(ActionStatus.SUCCESS);
		});
	});
});

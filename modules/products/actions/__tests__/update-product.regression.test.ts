/**
 * Regression tests for updateProduct hardening (audit catalogue 2026-05-28).
 *
 * @regression cat-audit-001 — status=PUBLIC doit passer validateProductForPublication
 * @regression cat-audit-003 — désactiver le SKU défaut bloqué (alignement update-sku-status)
 * @regression product-type-deactivated-blocks-edit — `isActive` du type exigé UNIQUEMENT
 *   s'il change. Avant : la transaction revalidait `productType.isActive` même quand
 *   l'admin ne touchait pas au type, donc désactiver un type rendait TOUS les bijoux qui
 *   le référencent inéditables (jusqu'au titre) — avec un message générique, le `throw`
 *   étant un `Error` nu et non une `BusinessError`. Aggravé par `getProductTypeOptions`
 *   qui filtre `isActive` : le select était vide, l'admin resoumettait un id invisible.
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
	// Sous-classe reelle : `instanceof` doit fonctionner cote action, et le nom
	// permet a mockHandleActionError de distinguer erreur metier / technique.
	BusinessError: class BusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	},
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
	typeId?: string | null;
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
		typeId: overrides.typeId === undefined ? "type_123" : overrides.typeId,
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
	overrides: { typeId?: string | null } = {},
) {
	return {
		id: VALID_CUID,
		title: "Bracelet Lune Updated",
		slug: "bracelet-lune",
		status: "DRAFT",
		typeId: overrides.typeId === undefined ? "type_123" : overrides.typeId,
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
		// Reproduit le vrai handleActionError : seules les BusinessError exposent leur
		// message, les erreurs techniques retombent sur le fallback.
		mockHandleActionError.mockImplementation((e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: e instanceof Error && e.name === "BusinessError" ? e.message : fallback,
		}));
	});

	// ===================================================================
	// CAT-AUDIT-001 — validation publication
	// ===================================================================

	// ===================================================================
	// CAT-AUDIT-004 — le produit soft-deleted n'est pas éditable
	// ===================================================================

	// `toggle-product-status.ts` porte ce filtre depuis un audit précédent, avec deux
	// régressions dédiées ; `updateProduct` ne l'avait pas. Résultat atteignable :
	// `status: PUBLIC` **avec** `deletedAt` posé — la désynchronisation que le test
	// `collection-selects-soft-delete.regression.test.ts` anticipe explicitement côté
	// lecture. La vitrine restait protégée (`notDeleted` partout), mais les gardes
	// d'ÉCRITURE qui ne filtrent que le statut s'y cassaient : `delete-product-type`
	// aurait refusé à jamais un type « ayant des produits PUBLIC » invisibles.
	//
	// Aucune surface admin n'expose un produit soft-deleted (il n'y a volontairement pas
	// de `restore-product`), donc c'est un durcissement contre un POST forgé — pas une
	// fuite active.
	describe("CAT-AUDIT-004: produit soft-deleted exclu de la lecture-avant-mutation", () => {
		it("filtre deletedAt: null dans le findUnique du produit", async () => {
			mockValidateInput.mockReturnValue({ data: buildValidatedData({ status: "DRAFT" }) });
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

			await updateProduct(undefined, formData);

			expect(mockPrisma.product.findUnique).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ deletedAt: null }),
				}),
			);
		});

		it("répond notFound et n'écrit RIEN quand le produit est soft-deleted", async () => {
			mockValidateInput.mockReturnValue({ data: buildValidatedData({ status: "PUBLIC" }) });
			// Le filtre `deletedAt: null` fait que Prisma ne rend rien.
			mockPrisma.product.findUnique.mockResolvedValue(null);

			const result = await updateProduct(undefined, formData);

			expect(result.status).toBe(ActionStatus.NOT_FOUND);
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
			expect(mockPrisma.product.update).not.toHaveBeenCalled();
			expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
		});
	});

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

	// ===================================================================
	// PRODUCT-TYPE-DEACTIVATED — isActive exigé uniquement si le type change
	// ===================================================================

	describe("PRODUCT-TYPE-DEACTIVATED: isActive du type exigé uniquement sur changement", () => {
		/** Etat commun : SKU défaut sain, statut DRAFT (pas de validation publication). */
		function arrange(opts: {
			validatedTypeId?: string | null;
			productTypeId?: string | null;
			foundType: { id: string; isActive: boolean } | null;
		}) {
			mockValidateInput.mockReturnValue({
				data: buildValidatedData({ status: "DRAFT", typeId: opts.validatedTypeId }),
			});
			mockPrisma.product.findUnique.mockResolvedValue(
				buildProductMock(
					[{ id: "sku_default", isActive: true, inventory: 10, images: [{ id: "img1" }] }],
					{ typeId: opts.productTypeId },
				),
			);
			mockPrisma.productSku.findFirst.mockResolvedValue({
				id: "sku_default",
				isDefault: true,
				isActive: true,
			});
			mockPrisma.productType.findUnique.mockResolvedValue(opts.foundType);
		}

		it("autorise l'édition quand le type est désactivé mais INCHANGÉ", async () => {
			arrange({
				validatedTypeId: "type_123",
				productTypeId: "type_123",
				foundType: { id: "type_123", isActive: false },
			});

			const result = await updateProduct(undefined, formData);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(mockPrisma.product.update).toHaveBeenCalled();
		});

		it("refuse le passage vers un type désactivé", async () => {
			arrange({
				validatedTypeId: "type_456",
				productTypeId: "type_123",
				foundType: { id: "type_456", isActive: false },
			});

			const result = await updateProduct(undefined, formData);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("désactivé");
			expect(mockHandleActionError).toHaveBeenCalledWith(
				expect.objectContaining({ name: "BusinessError" }),
				expect.any(String),
			);
			expect(mockPrisma.product.update).not.toHaveBeenCalled();
		});

		it("refuse un type inexistant même inchangé (existence inconditionnelle)", async () => {
			arrange({ validatedTypeId: "type_123", productTypeId: "type_123", foundType: null });

			const result = await updateProduct(undefined, formData);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("n'existe pas");
			expect(mockPrisma.product.update).not.toHaveBeenCalled();
		});

		it("charge typeId du produit pour pouvoir détecter le changement", async () => {
			arrange({
				validatedTypeId: "type_123",
				productTypeId: "type_123",
				foundType: { id: "type_123", isActive: true },
			});

			await updateProduct(undefined, formData);

			expect(mockPrisma.product.findUnique).toHaveBeenCalledWith(
				expect.objectContaining({
					select: expect.objectContaining({ typeId: true }),
				}),
			);
		});
	});
});

/**
 * @regression STOCK-PHANTOM-001
 *
 * Audit « SKUs et variantes » (2026-07-30), P0-2 — volet action.
 *
 * `updateProduct` écrivait le stock en ABSOLU sur le SKU par défaut :
 *
 *     data: { …, inventory: validatedData.defaultSku.inventory }
 *
 * sans verrou de ligne, sans delta, et sans `StockMovement`. C'est exactement le
 * bug corrigé le 2026-05-29 sur `update-sku` (« Trou B » de l'audit intégrité
 * stock) — resté vivant deux mois de plus sur CE formulaire, c'est-à-dire sur le
 * plus utilisé, puisqu'il édite le SKU des produits mono-variante.
 *
 * Scénario : l'admin ouvre « Modifier le produit » (stock 5) → une vente décrémente
 * à 4 → l'admin enregistre n'importe quel champ → le stock repart à 5. Le stock
 * fantôme se solde plus tard par un `OversellError` au webhook → commande FAILED +
 * remboursement automatique.
 *
 * Verrou : l'action délègue à `applyInventoryDeltaTx` (SSOT partagée avec
 * `update-sku`) et pose un `increment` relatif, JAMAIS une valeur absolue.
 *
 * Ce test vise l'ACTION et pas seulement le helper : `update-product.test.ts` avait
 * 0 assertion de stock, et le test de contrat des écrivains d'identité de variante
 * n'énumère pas les écrivains d'INVENTAIRE — rien n'aurait rougi.
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
		stockMovement: { create: vi.fn() },
		$queryRaw: vi.fn(),
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
// STOCK-STALE-BASELINE-001 : `updateProduct` délègue désormais l'invalidation SKU à
// la SSOT du module skus. Mockée ici — le test produit n'a pas à connaître ses tags,
// et `../../constants/cache` étant mocké, la vraie implémentation lirait des
// fabriques de tags undefined.
vi.mock("@/modules/skus/utils/cache.utils", () => ({
	getSkuInvalidationTags: vi.fn(() => ["skus-list"]),
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

const SKU_ID = "sku_default";

const formData = createMockFormData({
	productId: VALID_CUID,
	title: "Bracelet Lune",
	status: "DRAFT",
	"defaultSku.skuId": SKU_ID,
	"defaultSku.priceInclTaxEuros": "59.99",
	"defaultSku.inventory": "12",
	"defaultSku.originalInventory": "10",
});

/** `status: DRAFT` pour rester hors du chemin de validation de publication. */
function validatedData(opts: { inventory: number; originalInventory?: number }) {
	return {
		productId: VALID_CUID,
		title: "Bracelet Lune",
		description: "",
		typeId: "type_123",
		collectionIds: [],
		status: "DRAFT" as const,
		defaultSku: {
			skuId: SKU_ID,
			priceInclTaxEuros: 59.99,
			compareAtPriceEuros: undefined,
			inventory: opts.inventory,
			originalInventory: opts.originalInventory,
			isActive: true,
			colorIds: [],
			materialIds: [],
			size: "",
			media: [{ url: "https://utfs.io/f/test.webp", mediaType: "IMAGE" as const }],
		},
	};
}

/** Stock réellement en base au moment du save (après d'éventuelles ventes). */
function lockStock(inventory: number) {
	mockPrisma.$queryRaw.mockResolvedValue([{ inventory }]);
}

beforeEach(() => {
	vi.resetAllMocks();

	mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Léane" } });
	mockEnforceRateLimit.mockResolvedValue({ success: true });
	mockSanitizeText.mockImplementation((t: string) => t);
	mockDetectMediaType.mockReturnValue("IMAGE");
	mockGetProductInvalidationTags.mockReturnValue(["products-list"]);
	mockGetCollectionInvalidationTags.mockReturnValue([]);
	mockPrisma.$transaction.mockImplementation(
		async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
	);
	mockPrisma.product.findUnique.mockResolvedValue({
		id: VALID_CUID,
		title: "Bracelet Lune",
		slug: "bracelet-lune",
		status: "DRAFT",
		typeId: "type_123",
		collections: [],
		skus: [{ id: SKU_ID, isActive: true, inventory: 10, images: [{ mediaType: "IMAGE" }] }],
	});
	mockPrisma.productSku.findFirst.mockResolvedValue({
		id: SKU_ID,
		isDefault: true,
		isActive: true,
	});
	mockPrisma.productType.findUnique.mockResolvedValue({ id: "type_123", isActive: true });
	mockPrisma.collection.findMany.mockResolvedValue([]);
	mockPrisma.color.findMany.mockResolvedValue([]);
	mockPrisma.material.findMany.mockResolvedValue([]);
	mockPrisma.product.update.mockResolvedValue({
		id: VALID_CUID,
		title: "Bracelet Lune",
		slug: "bracelet-lune",
		description: "",
		status: "DRAFT",
		typeId: "type_123",
		updatedAt: new Date(),
	});
	mockPrisma.productSku.update.mockResolvedValue({});
	mockPrisma.stockMovement.create.mockResolvedValue({});
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
	mockHandleActionError.mockImplementation((e: unknown, fallback: string) => ({
		status: ActionStatus.ERROR,
		message: e instanceof Error && e.name === "BusinessError" ? e.message : fallback,
	}));
});

describe("STOCK-PHANTOM-001 — updateProduct n'écrase jamais le stock en absolu", () => {
	function skuUpdatePayload() {
		return mockPrisma.productSku.update.mock.calls[0]?.[0] as {
			data: { inventory?: unknown };
		};
	}

	it("écrit un increment relatif, jamais une valeur absolue", async () => {
		mockValidateInput.mockReturnValue({
			data: validatedData({ inventory: 12, originalInventory: 10 }),
		});
		lockStock(10);

		const result = await updateProduct(undefined, formData);

		// L'action doit RÉUSSIR : sans cette assertion, un throw en aval (invalidation
		// de cache, par ex.) laisserait les assertions de payload ci-dessous vertes.
		expect(result.status).toBe(ActionStatus.SUCCESS);
		// +2 relatif. `inventory: 12` (absolu) est précisément le bug.
		expect(skuUpdatePayload().data.inventory).toEqual({ increment: 2 });
		expect(skuUpdatePayload().data.inventory).not.toBe(12);
	});

	it("ne réintroduit pas une unité vendue pendant l'édition du formulaire", async () => {
		// Formulaire rendu à 5, l'admin n'y touche pas… mais une vente est passée à 4.
		mockValidateInput.mockReturnValue({
			data: validatedData({ inventory: 5, originalInventory: 5 }),
		});
		lockStock(4);

		const result = await updateProduct(undefined, formData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		// Delta 0 : le stock reste à 4. Un set absolu l'aurait remis à 5 — stock
		// fantôme, puis OversellError au prochain encaissement.
		expect(skuUpdatePayload().data.inventory).toEqual({ increment: 0 });
		expect(mockPrisma.stockMovement.create).not.toHaveBeenCalled();
	});

	it("prend un verrou de ligne FOR UPDATE sur le SKU", async () => {
		mockValidateInput.mockReturnValue({
			data: validatedData({ inventory: 12, originalInventory: 10 }),
		});
		lockStock(10);

		await updateProduct(undefined, formData);

		const rawCall = mockPrisma.$queryRaw.mock.calls[0]?.[0] as { strings?: string[] } | undefined;
		// Template literal Prisma : les fragments SQL vivent dans `.strings`.
		expect(JSON.stringify(rawCall?.strings ?? rawCall)).toMatch(/FOR UPDATE/);
	});

	it("trace le delta dans StockMovement avec la source SKU_UPDATE", async () => {
		mockValidateInput.mockReturnValue({
			data: validatedData({ inventory: 12, originalInventory: 10 }),
		});
		lockStock(10);

		await updateProduct(undefined, formData);

		expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				skuId: SKU_ID,
				previousInventory: 10,
				newInventory: 12,
				delta: 2,
				source: "SKU_UPDATE",
				createdById: "admin-1",
			}),
		});
	});

	it("refuse un save qui ferait passer le stock réel sous zéro", async () => {
		// L'admin retire 5 depuis un formulaire à 6, mais il ne reste qu'1 en base.
		mockValidateInput.mockReturnValue({
			data: validatedData({ inventory: 1, originalInventory: 6 }),
		});
		lockStock(1);

		const result = await updateProduct(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toMatch(/stock a changé/i);
	});
});

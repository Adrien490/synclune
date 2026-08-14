/**
 * @regression archived-restore-draft
 *
 * L'archivage désactive TOUS les SKUs du produit (`productSku.updateMany
 * { isActive: false }`). La restauration, elle, était câblée sur PUBLIC — à la fois
 * dans `archive-product-alert-dialog.tsx` (`targetStatus`) et dans le fallback de
 * l'action — et PUBLIC passe par `validateProductForPublication`, qui exige >= 1 SKU
 * ACTIF avec stock et image. Conséquence : tout produit archivé via l'UI était
 * irrécupérable en un clic (« Impossible de publier ce produit car il n'a aucune
 * variante active »), alors que le dialogue promettait « Vous pourrez le restaurer
 * à tout moment » puis « sera remis en statut Public ».
 *
 * Le test unitaire existant ne l'attrapait pas : son mock produit conservait des SKUs
 * actifs — un état que le chemin d'archivage rend précisément impossible.
 *
 * Fix verrouillé : ARCHIVED → DRAFT, sans validation de publication.
 *
 * ⚠️ Ce fichier n'utilise VOLONTAIREMENT pas de mock de
 * `product-validation.service` : c'est le vrai validateur qui doit tourner, sinon
 * la chaîne archivage → restauration n'est pas réellement exercée.
 */
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
	mockNotFound,
	mockGetProductInvalidationTags,
	mockGetCollectionInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		product: { findUnique: vi.fn(), update: vi.fn() },
		productSku: { updateMany: vi.fn() },
		orderItem: { count: vi.fn() },
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
	mockNotFound: vi.fn(),
	mockGetProductInvalidationTags: vi.fn(),
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
	ADMIN_PRODUCT_TOGGLE_STATUS_LIMIT: "admin-product-toggle-status",
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
	validationError: mockValidationError,
	notFound: mockNotFound,
}));
vi.mock("../../schemas/product.schemas", () => ({ toggleProductStatusSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductInvalidationTags: mockGetProductInvalidationTags,
}));
vi.mock("@/modules/collections/utils/cache.utils", () => ({
	getCollectionInvalidationTags: mockGetCollectionInvalidationTags,
}));

import { toggleProductStatus } from "../toggle-product-status";

// ============================================================================
// HELPERS
// ============================================================================

const formData = createMockFormData({
	productId: VALID_CUID,
	currentStatus: "PUBLIC",
	targetStatus: "",
});

/** Produit publiable : 1 SKU actif, avec stock et une vraie IMAGE. */
const publishableProduct = {
	id: VALID_CUID,
	title: "Bracelet Lune",
	slug: "bracelet-lune",
	status: "PUBLIC",
	collections: [{ collection: { slug: "bijoux" } }],
	skus: [
		{
			id: "sku_1",
			isActive: true,
			inventory: 5,
			images: [{ mediaType: "IMAGE" }],
			// Sélectionnés depuis la cascade cache couleurs/matériaux (audit cache
			// catalogue 2026-07-31) — le fixture doit refléter le select réel.
			colors: [],
			materials: [],
		},
	],
};

/** Le même produit après archivage : le SKU a été désactivé par l'action. */
const archivedProduct = {
	...publishableProduct,
	status: "ARCHIVED",
	skus: [
		{
			id: "sku_1",
			isActive: false,
			inventory: 5,
			images: [{ mediaType: "IMAGE" }],
			// Sélectionnés depuis la cascade cache couleurs/matériaux (audit cache
			// catalogue 2026-07-31) — le fixture doit refléter le select réel.
			colors: [],
			materials: [],
		},
	],
};

describe("toggleProductStatus — restauration (@regression archived-restore-draft)", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ admin: true });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetProductInvalidationTags.mockReturnValue(["products-list"]);
		mockGetCollectionInvalidationTags.mockReturnValue(["collection-bijoux"]);
		mockPrisma.orderItem.count.mockResolvedValue(0);
		mockPrisma.product.update.mockResolvedValue({});
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);

		mockSuccess.mockImplementation((message: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
		}));
		mockValidationError.mockImplementation((message: string) => ({
			status: ActionStatus.VALIDATION_ERROR,
			message,
		}));
		mockError.mockImplementation((message: string) => ({
			status: ActionStatus.ERROR,
			message,
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

	it("précondition : archiver désactive toutes les variantes du produit", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "PUBLIC", targetStatus: "ARCHIVED" },
		});
		mockPrisma.product.findUnique.mockResolvedValue(publishableProduct);

		const result = await toggleProductStatus(undefined, formData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.updateMany).toHaveBeenCalledWith({
			where: { productId: VALID_CUID },
			data: { isActive: false },
		});
	});

	it("restaure un produit archivé en BROUILLON (le vrai validateur ne peut plus bloquer)", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "ARCHIVED", targetStatus: null },
		});
		mockPrisma.product.findUnique.mockResolvedValue(archivedProduct);

		const result = await toggleProductStatus(undefined, formData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.product.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { status: "DRAFT" },
		});
		expect(result.message).toContain("brouillon");
		// Le message doit dire quoi faire ensuite, sinon l'admin retombe sur un
		// « Publier » qui échoue.
		expect(result.message).toContain("variante");
	});

	it("restaure aussi quand le dialogue envoie explicitement targetStatus=DRAFT", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "ARCHIVED", targetStatus: "DRAFT" },
		});
		mockPrisma.product.findUnique.mockResolvedValue(archivedProduct);

		const result = await toggleProductStatus(undefined, formData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.product.update).toHaveBeenCalledWith({
			where: { id: VALID_CUID },
			data: { status: "DRAFT" },
		});
	});

	it("publier explicitement un produit archivé reste refusé (aucune variante active)", async () => {
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "ARCHIVED", targetStatus: "PUBLIC" },
		});
		mockPrisma.product.findUnique.mockResolvedValue(archivedProduct);

		const result = await toggleProductStatus(undefined, formData);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toContain("variante active");
		expect(mockPrisma.product.update).not.toHaveBeenCalled();
	});
});

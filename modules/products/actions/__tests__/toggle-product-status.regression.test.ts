/**
 * @regression product-zombie-resurrection
 *
 * Un produit soft-deleted (deleteProduct pose status ARCHIVED + deletedAt) pouvait
 * être "ressuscité" en PUBLIC via toggleProductStatus (transition ARCHIVED → PUBLIC)
 * en GARDANT son deletedAt : état zombie qui fuyait dans les selects collections
 * filtrés sur status seul.
 *
 * Fix verrouillé : le findUnique de toggle-product-status.ts filtre désormais
 * where: { id, deletedAt: null } — un produit soft-deleted est donc introuvable
 * (notFound) et aucune mutation n'est exécutée.
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
	mockValidateProductForPublication,
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
	mockValidateProductForPublication: vi.fn(),
	mockGetProductInvalidationTags: vi.fn(),
	mockGetCollectionInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
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
vi.mock("../../services/product-validation.service", () => ({
	validateProductForPublication: mockValidateProductForPublication,
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

const restoreFormData = createMockFormData({
	productId: VALID_CUID,
	currentStatus: "ARCHIVED",
	targetStatus: "",
});

const mockArchivedProduct = {
	id: VALID_CUID,
	title: "Bracelet Lune",
	slug: "bracelet-lune",
	status: "ARCHIVED",
	description: "Un bracelet artisanal",
	collections: [{ collection: { slug: "bijoux" } }],
	skus: [
		{
			id: "sku_1",
			isActive: true,
			inventory: 5,
			images: [{ mediaType: "IMAGE" }],
		},
	],
};

// ============================================================================
// TESTS
// ============================================================================

describe("toggleProductStatus — régression zombie (soft-deleted ressuscité)", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		// Scénario zombie : restore ARCHIVED → PUBLIC (toggle sans targetStatus)
		mockValidateInput.mockReturnValue({
			data: { productId: VALID_CUID, currentStatus: "ARCHIVED", targetStatus: null },
		});
		mockValidateProductForPublication.mockReturnValue({ isValid: true });
		mockGetProductInvalidationTags.mockReturnValue(["products-list", "product-bracelet-lune"]);
		mockGetCollectionInvalidationTags.mockReturnValue(["collection-bijoux"]);

		mockPrisma.product.findUnique.mockResolvedValue(mockArchivedProduct);
		mockPrisma.orderItem.count.mockResolvedValue(0);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		mockPrisma.product.update.mockResolvedValue({ id: VALID_CUID });
		mockPrisma.productSku.updateMany.mockResolvedValue({ count: 1 });

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
		mockNotFound.mockImplementation((msg: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should filter soft-deleted products out of the lookup (deletedAt: null in where)", async () => {
		await toggleProductStatus(undefined, restoreFormData);

		expect(mockPrisma.product.findUnique).toHaveBeenCalledTimes(1);
		expect(mockPrisma.product.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: VALID_CUID, deletedAt: null }),
			}),
		);
	});

	it("should return notFound and never mutate when the product is soft-deleted (findUnique → null)", async () => {
		// Produit soft-deleted : le filtre deletedAt: null le rend introuvable
		mockPrisma.product.findUnique.mockResolvedValue(null);

		const result = await toggleProductStatus(undefined, restoreFormData);

		expect(mockNotFound).toHaveBeenCalledWith("Produit");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		// Aucune résurrection : ni transaction, ni update de statut
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		expect(mockPrisma.product.update).not.toHaveBeenCalled();
	});
});

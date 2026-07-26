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
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockValidateInput,
	mockGetSkuInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		// `findMany` + `$queryRaw` servent `assertUniqueVariantCombination` (advisory
		// lock puis lecture des candidats en collision) appelée à l'activation.
		productSku: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
		$transaction: vi.fn(),
		$queryRaw: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockValidateInput: vi.fn(),
	mockGetSkuInvalidationTags: vi.fn(),
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
	ADMIN_SKU_TOGGLE_STATUS_LIMIT: "sku-toggle-status",
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	BusinessError: class extends Error {},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("../../schemas/sku.schemas", () => ({ updateProductSkuStatusSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));

import { updateProductSkuStatus } from "../update-sku-status";

// ============================================================================
// HELPERS
// ============================================================================

const deactivateFormData = createMockFormData({ skuId: VALID_CUID, isActive: "false" });
const activateFormData = createMockFormData({ skuId: VALID_CUID, isActive: "true" });

function createMockExistingSku(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		sku: "BRC-LUNE-OR-M",
		isActive: true,
		isDefault: false,
		productId: "prod-1",
		// Lus par `assertUniqueVariantCombination` à l'ACTIVATION : publier une
		// variante dont l'identité (produit × taille × set de couleurs) collisionne
		// est interdit — cas produit par `duplicate-sku`. Audit schéma 2026-07-26.
		size: "M",
		colors: [{ colorId: "color-or" }],
		product: {
			slug: "bracelet-lune",
			status: "DRAFT",
			_count: { skus: 2 },
		},
		...overrides,
	};
}

function createMockUpdatedSku(isActive: boolean) {
	return { id: VALID_CUID, sku: "BRC-LUNE-OR-M", isActive };
}

// ============================================================================
// TESTS
// ============================================================================

describe("updateProductSkuStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: false } });

		mockPrisma.productSku.findUnique.mockResolvedValue(createMockExistingSku());
		mockPrisma.productSku.update.mockResolvedValue(createMockUpdatedSku(false));
		// Aucun candidat en collision par défaut (garde d'identité de variante).
		mockPrisma.productSku.findMany.mockResolvedValue([]);
		mockPrisma.$queryRaw.mockResolvedValue([]);
		mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
			fn(mockPrisma),
		);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: e instanceof Error ? e.message : fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalid" },
		});
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return error when SKU does not exist", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(null);
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("n'existe pas");
	});

	it("should return error when trying to deactivate the default SKU", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockExistingSku({ isDefault: true, isActive: true }),
		);
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: false } });
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Impossible de désactiver");
	});

	it("should succeed when deactivating a non-default SKU", async () => {
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: false } });
		mockPrisma.productSku.update.mockResolvedValue(createMockUpdatedSku(false));
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { isActive: false } }),
		);
	});

	it("should succeed when activating an inactive SKU", async () => {
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: true } });
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockExistingSku({ isActive: false, isDefault: false }),
		);
		mockPrisma.productSku.update.mockResolvedValue(createMockUpdatedSku(true));
		const result = await updateProductSkuStatus(undefined, activateFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { isActive: true } }),
		);
	});

	// @regression sku-variant-identity-guard — audit schéma 2026-07-26.
	//
	// `duplicate-sku` crée volontairement une copie à l'identité IDENTIQUE (même
	// taille, même set de couleurs) en `isActive: false`. Rien n'obligeait l'admin
	// à l'éditer : « Dupliquer » puis « Activer » publiait deux variantes
	// indistinguables, rendant le sélecteur du storefront ambigu. Aucune
	// contrainte DB ne peut l'empêcher (l'identité dépend d'une table de
	// jointure) — la garde applicative à l'activation est le seul rempart.
	it("refuse d'activer une variante dont l'identité collisionne (Dupliquer → Activer)", async () => {
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: true } });
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockExistingSku({ isActive: false, size: "M", colors: [{ colorId: "color-or" }] }),
		);
		// L'original : même produit, même taille, même set de couleurs.
		mockPrisma.productSku.findMany.mockResolvedValue([
			{ id: "sku-original", sku: "BRC-LUNE-OR-M", colors: [{ colorId: "color-or" }] },
		]);

		const result = await updateProductSkuStatus(undefined, activateFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("existe déjà");
		expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
	});

	it("ne vérifie PAS l'identité de variante à la désactivation (jamais de collision)", async () => {
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: false } });
		mockPrisma.productSku.findUnique.mockResolvedValue(createMockExistingSku({ isActive: true }));

		await updateProductSkuStatus(undefined, deactivateFormData);

		// Pas d'advisory lock pris : retirer une variante du storefront ne peut pas
		// créer de doublon, et verrouiller le produit inutilement sérialiserait les
		// désactivations.
		expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
	});

	it("should invalidate cache tags after successful update", async () => {
		await updateProductSkuStatus(undefined, deactivateFormData);
		expect(mockGetSkuInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	// ============================================================================
	// PUBLIC PRODUCT GUARD (P1.1)
	// ============================================================================

	it("should reject deactivation of the last active SKU of a PUBLIC product", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockExistingSku({
				isActive: true,
				isDefault: false,
				product: {
					slug: "bracelet-lune",
					status: "PUBLIC",
					_count: { skus: 1 },
				},
			}),
		);
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: false } });
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should allow deactivation when PUBLIC product still has another active SKU", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockExistingSku({
				isActive: true,
				isDefault: false,
				product: {
					slug: "bracelet-lune",
					status: "PUBLIC",
					_count: { skus: 2 },
				},
			}),
		);
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: false } });
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should ignore PUBLIC guard for DRAFT product even when last SKU", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockExistingSku({
				isActive: true,
				isDefault: false,
				product: {
					slug: "bracelet-lune",
					status: "DRAFT",
					_count: { skus: 1 },
				},
			}),
		);
		mockValidateInput.mockReturnValue({ data: { skuId: VALID_CUID, isActive: false } });
		const result = await updateProductSkuStatus(undefined, deactivateFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});
});

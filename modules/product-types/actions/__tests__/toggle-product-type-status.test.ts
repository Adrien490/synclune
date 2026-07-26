import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

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
	mockNotFound,
	mockGetProductTypeInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productType: {
			findUnique: vi.fn(),
			updateMany: vi.fn(),
		},
		// Compte d'usage informatif a la desactivation (avertir, pas bloquer).
		product: { count: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockGetProductTypeInvalidationTags: vi.fn(),
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
	ADMIN_PRODUCT_TYPE_LIMITS: { TOGGLE_STATUS: "pt-toggle" },
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
	notFound: mockNotFound,
}));
vi.mock("../../schemas/product-type.schemas", () => ({ toggleProductTypeStatusSchema: {} }));
vi.mock("../../utils/cache.utils", () => ({
	getProductTypeInvalidationTags: mockGetProductTypeInvalidationTags,
}));

import { toggleProductTypeStatus } from "../toggle-product-type-status";

// ============================================================================
// HELPERS
// ============================================================================

function makeProductType(overrides: Record<string, unknown> = {}) {
	return {
		id: "pt-1",
		label: "Bague",
		isSystem: false,
		isActive: false,
		...overrides,
	};
}

function makeFormData(productTypeId: string, isActive: boolean) {
	return createMockFormData({ productTypeId, isActive: String(isActive) });
}

// ============================================================================
// TESTS
// ============================================================================

describe("toggleProductTypeStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { productTypeId: "pt-1", isActive: true } });
		mockGetProductTypeInvalidationTags.mockReturnValue(["product-types-list"]);
		// Happy path: updateMany affects 1 row, then findUnique returns label for audit
		mockPrisma.productType.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.productType.findUnique.mockResolvedValue({ label: "Bague" });
		// Obligatoire : `resetAllMocks` ferait renvoyer `undefined`, et la comparaison
		// `usageCount > 0` lirait alors une valeur non numerique.
		mockPrisma.product.count.mockResolvedValue(0);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockNotFound.mockImplementation((label: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${label} non trouvé`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true));
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true));
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should call updateMany atomically with isSystem=false and isActive NOT target", async () => {
		await toggleProductTypeStatus(undefined, makeFormData("pt-1", true));
		expect(mockPrisma.productType.updateMany).toHaveBeenCalledWith({
			where: { id: "pt-1", isSystem: false, isActive: { not: true } },
			data: { isActive: true },
		});
	});

	it("should return not found when updateMany affects 0 rows AND type does not exist", async () => {
		mockPrisma.productType.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.productType.findUnique.mockResolvedValue(null);
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true));
		expect(mockNotFound).toHaveBeenCalledWith("Type de produit");
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when updateMany affects 0 rows AND type is system", async () => {
		mockPrisma.productType.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.productType.findUnique.mockResolvedValue(
			makeProductType({ isSystem: true, label: "Collier" }),
		);
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true));
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("systeme");
		expect(result.message).toContain("Collier");
	});

	it("should return idempotent success when updateMany affects 0 rows AND type already in state", async () => {
		mockPrisma.productType.updateMany.mockResolvedValue({ count: 0 });
		mockPrisma.productType.findUnique.mockResolvedValue(
			makeProductType({ isSystem: false, isActive: true }),
		);
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true));
		expect(mockSuccess).toHaveBeenCalledWith("Type déjà activé");
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockGetProductTypeInvalidationTags).not.toHaveBeenCalled();
	});

	it("should activate type and return correct success message", async () => {
		mockValidateInput.mockReturnValue({ data: { productTypeId: "pt-1", isActive: true } });
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true));
		expect(mockSuccess).toHaveBeenCalledWith("Type activé avec succès");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should deactivate type and return correct success message", async () => {
		mockValidateInput.mockReturnValue({ data: { productTypeId: "pt-1", isActive: false } });
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", false));
		expect(mockPrisma.productType.updateMany).toHaveBeenCalledWith({
			where: { id: "pt-1", isSystem: false, isActive: { not: false } },
			data: { isActive: false },
		});
		expect(mockSuccess).toHaveBeenCalledWith("Type désactivé avec succès");
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	// ------------------------------------------------------------------
	// Avertissement d'usage a la desactivation (audit catalogue 2026-07-26)
	// La desactivation est le retrait DOUX : elle ne doit jamais bloquer, sinon
	// les types justement utilises n'auraient plus aucun chemin de retrait
	// (deleteProductType bloque deja sur les produits PUBLIC).
	// ------------------------------------------------------------------

	it("avertit sans bloquer quand des bijoux utilisent encore le type", async () => {
		mockValidateInput.mockReturnValue({ data: { productTypeId: "pt-1", isActive: false } });
		mockPrisma.product.count.mockResolvedValue(3);

		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", false));

		expect(mockPrisma.product.count).toHaveBeenCalledWith({
			where: { typeId: "pt-1", deletedAt: null },
		});
		// La mutation a bien eu lieu : on avertit, on ne bloque pas.
		expect(mockPrisma.productType.updateMany).toHaveBeenCalledWith({
			where: { id: "pt-1", isSystem: false, isActive: { not: false } },
			data: { isActive: false },
		});
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("3 bijoux");
	});

	it("accorde l'avertissement au singulier", async () => {
		mockValidateInput.mockReturnValue({ data: { productTypeId: "pt-1", isActive: false } });
		mockPrisma.product.count.mockResolvedValue(1);

		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", false));

		expect(result.message).toContain("1 bijou l'utilise encore : il le conserve");
		expect(result.message).not.toContain("1 bijoux");
	});

	it("ne compte pas les bijoux lors d'une activation", async () => {
		mockValidateInput.mockReturnValue({ data: { productTypeId: "pt-1", isActive: true } });

		await toggleProductTypeStatus(undefined, makeFormData("pt-1", true));

		expect(mockPrisma.product.count).not.toHaveBeenCalled();
	});

	it("should invalidate cache after successful status update", async () => {
		await toggleProductTypeStatus(undefined, makeFormData("pt-1", true));
		expect(mockGetProductTypeInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalledWith("product-types-list");
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.productType.updateMany.mockRejectedValue(new Error("DB crash"));
		const result = await toggleProductTypeStatus(undefined, makeFormData("pt-1", true));
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

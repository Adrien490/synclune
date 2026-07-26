/**
 * Regression tests for updateProductSku hardening (audit catalogue 2026-05-28).
 *
 * @regression cat-audit-002 — retirer isDefault sans transfert bloqué
 * @regression cat-audit-003 — désactiver le SKU défaut bloqué
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, VALID_CUID } from "@/test/factories";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockDetectMediaType,
	mockParseMedia,
	mockSafeParse,
	mockGetSkuInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		productSku: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
		skuMedia: { deleteMany: vi.fn(), create: vi.fn(), createMany: vi.fn() },
		stockMovement: { create: vi.fn() },
		color: { findUnique: vi.fn(), findMany: vi.fn() },
		material: { findUnique: vi.fn(), findMany: vi.fn() },
		$transaction: vi.fn(),
		$queryRaw: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockDetectMediaType: vi.fn(),
	mockParseMedia: vi.fn(),
	mockSafeParse: vi.fn(),
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
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_UPDATE_LIMIT: "sku-update" }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	safeFormGetJSON: <T>(formData: FormData, key: string): T | null => {
		const v = formData.get(key);
		if (typeof v !== "string") return null;
		try {
			return JSON.parse(v) as T;
		} catch {
			return null;
		}
	},
	BusinessError: class BusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	},
	validateInput: vi.fn().mockReturnValue({ data: {} }),
	validationError: (message: string) => ({ status: ActionStatus.VALIDATION_ERROR, message }),
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
}));
vi.mock("@/modules/media/utils/media-type-detection", () => ({
	detectMediaType: mockDetectMediaType,
}));
vi.mock("../../schemas/sku.schemas", () => ({
	updateProductSkuSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../utils/cache.utils", () => ({ getSkuInvalidationTags: mockGetSkuInvalidationTags }));
vi.mock("../../utils/parse-media-from-form", () => ({
	parseMediaFromForm: mockParseMedia,
	parseMediaFromFormStrict: mockParseMedia,
}));
vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: vi.fn().mockResolvedValue({ deleted: 0, failed: 0 }),
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("@/modules/wishlist/services/notify-back-in-stock", () => ({
	notifyBackInStock: vi.fn().mockResolvedValue(undefined),
}));

import { updateProductSku } from "../update-sku";

// ============================================================================
// Helpers
// ============================================================================

const formData = createMockFormData({
	skuId: VALID_CUID,
	priceInclTaxEuros: "59.99",
	inventory: "15",
});

function buildValidatedData(overrides: Partial<{ isActive: boolean; isDefault: boolean }>) {
	return {
		skuId: VALID_CUID,
		priceInclTaxEuros: 59.99,
		inventory: 15,
		isActive: overrides.isActive ?? true,
		isDefault: overrides.isDefault ?? false,
		colorIds: [],
		materialIds: [],
		size: "",
		media: [],
	};
}

function buildSkuMock(overrides: Partial<{ isActive: boolean; isDefault: boolean }>) {
	return {
		id: VALID_CUID,
		sku: "BRC-01",
		isActive: overrides.isActive ?? true,
		isDefault: overrides.isDefault ?? false,
		inventory: 5,
		productId: "prod-1",
		product: {
			id: "prod-1",
			title: "Bracelet",
			slug: "test",
			status: "DRAFT",
			_count: { skus: 2 }, // 2 SKUs actifs → assertPublicProductKeepsActiveSku ne déclenche pas
		},
		colors: [],
		materials: [],
		images: [],
	};
}

// ============================================================================
// Tests
// ============================================================================

describe("updateProductSku — regression hardening", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockParseMedia.mockReturnValue([]);
		mockDetectMediaType.mockReturnValue("IMAGE");

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		// SELECT inventory ... FOR UPDATE (verrou avant écriture delta) — aligné sur
		// buildSkuMock.inventory (5).
		mockPrisma.$queryRaw.mockResolvedValue([{ inventory: 5 }]);
		mockPrisma.productSku.findFirst.mockResolvedValue(null);
		mockPrisma.productSku.findMany.mockResolvedValue([]);
		mockPrisma.productSku.update.mockResolvedValue({
			id: VALID_CUID,
			sku: "BRC-01",
			productId: "prod-1",
			product: { title: "Bracelet", slug: "test" },
			colors: [],
			materials: [],
			size: null,
		});
		mockPrisma.productSku.updateMany.mockResolvedValue({});
		mockPrisma.skuMedia.deleteMany.mockResolvedValue({});
		mockPrisma.skuMedia.create.mockResolvedValue({});
		mockPrisma.skuMedia.createMany.mockResolvedValue({ count: 0 });
		mockPrisma.stockMovement.create.mockResolvedValue({});
		mockPrisma.color.findMany.mockResolvedValue([]);
		mockPrisma.material.findMany.mockResolvedValue([]);

		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockError.mockImplementation((msg: string) => ({
			status: ActionStatus.ERROR,
			message: msg,
		}));
		// Aligne le mock sur le comportement reel: BusinessError expose son message
		// (cf. shared/lib/actions/errors.ts:57-62). Sans ça les régressions
		// CAT-AUDIT-002 + CAT-AUDIT-003 verraient le fallback générique.
		mockHandleActionError.mockImplementation((e: unknown, fallback: string) => {
			if (e instanceof Error && e.name === "BusinessError") {
				return { status: ActionStatus.ERROR, message: e.message };
			}
			return { status: ActionStatus.ERROR, message: fallback };
		});
	});

	// ===================================================================
	// CAT-AUDIT-002 — retrait isDefault sans transfert
	// ===================================================================

	describe("CAT-AUDIT-002: removing isDefault without transfer", () => {
		it("rejects when isDefault transitions true → false on the current default SKU", async () => {
			mockSafeParse.mockReturnValue({
				success: true,
				data: buildValidatedData({ isDefault: false, isActive: true }),
			});
			mockPrisma.productSku.findUnique.mockResolvedValue(
				buildSkuMock({ isDefault: true, isActive: true }),
			);

			const result = await updateProductSku(undefined, formData);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("principale");
			expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
		});

		it("accepts when isDefault stays true on the current default SKU", async () => {
			mockSafeParse.mockReturnValue({
				success: true,
				data: buildValidatedData({ isDefault: true, isActive: true }),
			});
			mockPrisma.productSku.findUnique.mockResolvedValue(
				buildSkuMock({ isDefault: true, isActive: true }),
			);

			const result = await updateProductSku(undefined, formData);
			expect(result.status).toBe(ActionStatus.SUCCESS);
		});

		it("accepts setting isDefault=true on a previously non-default SKU (transfer)", async () => {
			mockSafeParse.mockReturnValue({
				success: true,
				data: buildValidatedData({ isDefault: true, isActive: true }),
			});
			mockPrisma.productSku.findUnique.mockResolvedValue(
				buildSkuMock({ isDefault: false, isActive: true }),
			);

			const result = await updateProductSku(undefined, formData);
			expect(result.status).toBe(ActionStatus.SUCCESS);
			// unsetOtherDefaultSkus must have been called
			expect(mockPrisma.productSku.updateMany).toHaveBeenCalled();
		});
	});

	// ===================================================================
	// CAT-AUDIT-003 — désactivation du SKU défaut
	// ===================================================================

	describe("CAT-AUDIT-003: deactivating the default SKU", () => {
		it("rejects when isActive transitions true → false on the current default SKU", async () => {
			mockSafeParse.mockReturnValue({
				success: true,
				data: buildValidatedData({ isDefault: true, isActive: false }),
			});
			mockPrisma.productSku.findUnique.mockResolvedValue(
				buildSkuMock({ isDefault: true, isActive: true }),
			);

			const result = await updateProductSku(undefined, formData);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("principale");
			expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
		});

		it("accepts deactivating a non-default SKU when another active SKU exists", async () => {
			mockSafeParse.mockReturnValue({
				success: true,
				data: buildValidatedData({ isDefault: false, isActive: false }),
			});
			mockPrisma.productSku.findUnique.mockResolvedValue(
				buildSkuMock({ isDefault: false, isActive: true }),
			);

			const result = await updateProductSku(undefined, formData);
			expect(result.status).toBe(ActionStatus.SUCCESS);
		});
	});

	// STOCK-INTEGRITY: l'écriture inventory admin applique un DELTA relatif à la
	// valeur affichée (originalInventory) sous FOR UPDATE, jamais un set absolu.
	// Garde contre l'écrasement des décréments webhook commités pendant l'édition.
	describe("STOCK-INTEGRITY: inventory delta sous verrou", () => {
		it("champ inchangé (delta 0) ne réécrit pas le stock même si des ventes ont décrémenté la DB", async () => {
			// Admin a vu 15, soumet 15 ; mais 3 ventes ont fait passer la DB à 12.
			mockSafeParse.mockReturnValue({
				success: true,
				data: { ...buildValidatedData({}), inventory: 15, originalInventory: 15 },
			});
			mockPrisma.productSku.findUnique.mockResolvedValue(buildSkuMock({}));
			mockPrisma.$queryRaw.mockResolvedValue([{ inventory: 12 }]); // stock réel verrouillé

			const result = await updateProductSku(undefined, formData);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			// delta = 15 - 15 = 0 → DB reste 12, les ventes ne sont PAS écrasées.
			expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ inventory: { increment: 0 } }),
				}),
			);
			// delta 0 → aucun mouvement de stock fantôme dans l'audit.
			expect(mockPrisma.stockMovement.create).not.toHaveBeenCalled();
		});

		it("baisse volontaire applique le delta relatif (préserve les ventes concurrentes)", async () => {
			// Admin a vu 15, recompte et soumet 5 (intention −10) ; DB déjà à 12.
			mockSafeParse.mockReturnValue({
				success: true,
				data: { ...buildValidatedData({}), inventory: 5, originalInventory: 15 },
			});
			mockPrisma.productSku.findUnique.mockResolvedValue(buildSkuMock({}));
			mockPrisma.$queryRaw.mockResolvedValue([{ inventory: 12 }]);

			const result = await updateProductSku(undefined, formData);

			expect(result.status).toBe(ActionStatus.SUCCESS);
			// delta = 5 - 15 = -10 → 12 + (-10) = 2, pas un set absolu à 5.
			expect(mockPrisma.productSku.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ inventory: { increment: -10 } }),
				}),
			);
			// Le delta appliqué est tracé dans StockMovement (source SKU_UPDATE),
			// atomique avec l'update — parité d'audit avec adjust-sku-stock.
			expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						skuId: VALID_CUID,
						previousInventory: 12,
						newInventory: 2,
						delta: -10,
						source: "SKU_UPDATE",
						createdById: "admin-1",
					}),
				}),
			);
		});

		it("rejette si le delta ferait passer le stock sous zéro (stock changé entre-temps)", async () => {
			// Admin a vu 15, soumet 5 (−10) ; mais des ventes ont vidé la DB à 3.
			mockSafeParse.mockReturnValue({
				success: true,
				data: { ...buildValidatedData({}), inventory: 5, originalInventory: 15 },
			});
			mockPrisma.productSku.findUnique.mockResolvedValue(buildSkuMock({}));
			mockPrisma.$queryRaw.mockResolvedValue([{ inventory: 3 }]); // 3 + (-10) = -7 < 0

			const result = await updateProductSku(undefined, formData);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
		});
	});
});

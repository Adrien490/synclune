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
	mockHandleActionError,
	mockGetSkuInvalidationTags,
	mockDeleteUploadThingFiles,
	mockSafeParse,
} = vi.hoisted(() => ({
	mockPrisma: {
		productSku: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		orderItem: {
			count: vi.fn(),
			findMany: vi.fn(),
		},
		skuMedia: {
			findMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetSkuInvalidationTags: vi.fn(),
	mockDeleteUploadThingFiles: vi.fn(),
	mockSafeParse: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mockRequireAdmin,
	requireAdminWithUser: mockRequireAdmin,
}));
vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({ ADMIN_SKU_DELETE_LIMIT: "sku-delete" }));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	BusinessError: class extends Error {},
	handleActionError: mockHandleActionError,
	success: (message: string, data?: unknown) => ({ status: ActionStatus.SUCCESS, message, data }),
	error: (message: string) => ({ status: ActionStatus.ERROR, message }),
	notFound: (entity: string) => ({
		status: ActionStatus.NOT_FOUND,
		message: `${entity} introuvable`,
	}),
	validationError: (message: string) => ({ status: ActionStatus.VALIDATION_ERROR, message }),
	validateInput: (schema: { safeParse: (data: unknown) => unknown }, data: unknown) => {
		const result = schema.safeParse(data) as
			| { success: true; data: unknown }
			| { success: false; error: { issues: { message?: string }[] } };
		if (!result.success) {
			return {
				error: {
					status: ActionStatus.VALIDATION_ERROR,
					message: result.error.issues[0]?.message ?? "Données invalides",
				},
			};
		}
		return { data: result.data };
	},
}));
vi.mock("@/modules/media/services/delete-uploadthing-files.service", () => ({
	deleteUploadThingFilesFromUrls: mockDeleteUploadThingFiles,
}));
vi.mock("../../schemas/sku.schemas", () => ({
	deleteProductSkuSchema: { safeParse: mockSafeParse },
}));
vi.mock("../../utils/cache.utils", () => ({
	getSkuInvalidationTags: mockGetSkuInvalidationTags,
}));

import { deleteProductSku } from "../delete-sku";
// Mocked class (cf. vi.mock ci-dessus) — la même instance que celle utilisée par l'action
import { BusinessError } from "@/shared/lib/actions";

// ============================================================================
// HELPERS
// ============================================================================

const validFormData = createMockFormData({ skuId: VALID_CUID });

function createMockSkuForDelete(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CUID,
		sku: "BRC-LUNE-OR-M",
		isActive: true,
		productId: "prod-1",
		images: [],
		colors: [
			{ colorId: "color-cuid-1", color: { slug: "or" } },
			{ colorId: "color-cuid-2", color: { slug: "argent" } },
		],
		materials: [{ material: { slug: "or-18k" } }],
		product: {
			title: "Bracelet Lune",
			slug: "bracelet-lune",
			status: "PUBLIC",
			_count: { skus: 2 },
			// Include both the SKU being deleted and another active SKU (length >= 2 passes the guard)
			skus: [{ id: VALID_CUID }, { id: VALID_CUID_2 }],
		},
		_count: { orderItems: 0 },
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe("deleteProductSku", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockGetSkuInvalidationTags.mockReturnValue(["skus-list"]);
		mockDeleteUploadThingFiles.mockResolvedValue(undefined);

		mockSafeParse.mockReturnValue({
			success: true,
			data: { skuId: VALID_CUID },
		});

		mockPrisma.productSku.findUnique.mockResolvedValue(createMockSkuForDelete());
		mockPrisma.productSku.findFirst.mockResolvedValue(null);
		mockPrisma.productSku.update.mockResolvedValue({});
		mockPrisma.productSku.delete.mockResolvedValue({});
		// Re-check anti-race dans la transaction : 0 = pas de course par défaut
		mockPrisma.orderItem.count.mockResolvedValue(0);
		// La SSOT deleteUnreferencedCatalogMedia lit OrderItem ET SkuMedia : un
		// `findMany` non armé (undefined) ferait échouer son Promise.all en
		// silence (catch interne) et aucune suppression ne serait observée.
		mockPrisma.orderItem.findMany.mockResolvedValue([]);
		mockPrisma.skuMedia.findMany.mockResolvedValue([]);
		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);

		// Miroir du vrai handleActionError : expose le message d'une BusinessError,
		// fallback générique sinon
		mockHandleActionError.mockImplementation((e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: e instanceof BusinessError ? (e as Error).message : fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "No" },
		});
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate" },
		});
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid skuId", async () => {
		mockSafeParse.mockReturnValue({
			success: false,
			error: { issues: [{ message: "ID invalide" }] },
		});
		const result = await deleteProductSku(undefined, createMockFormData({ skuId: "bad" }));
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should return NOT_FOUND when SKU does not exist", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(null);
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("should return error when SKU is the last one for the product", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockSkuForDelete({
				product: {
					title: "Bracelet",
					slug: "bracelet-lune",
					status: "PUBLIC",
					_count: { skus: 1 },
					skus: [{ id: VALID_CUID }],
				},
			}),
		);
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("dernière variante");
	});

	it("should return error when SKU has order items", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockSkuForDelete({ _count: { orderItems: 3 } }),
		);
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("3 article");
	});

	it("should use singular article label for exactly 1 order item", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockSkuForDelete({ _count: { orderItems: 1 } }),
		);
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("1 article");
		expect(result.message).not.toContain("articles");
	});

	/**
	 * La garde « présente dans N paniers » a disparu avec le passage du panier en
	 * cookie (2026-08-04) : plus de table `CartItem`, plus de FK `onDelete: Restrict`,
	 * et surtout aucune visibilité serveur sur les paniers des visiteurs. La
	 * suppression est donc désormais PERMISE dans ce cas — la ligne du cookie
	 * devient simplement inerte (`getCart()` écarte un SKU soft-deleted).
	 */
	it("supprime désormais un SKU même s'il pourrait être dans des paniers", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockSkuForDelete({ _count: { orderItems: 0 } }),
		);
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("should return error when PUBLIC product would have no active SKU after delete", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			createMockSkuForDelete({
				isActive: true,
				product: {
					title: "Bracelet",
					slug: "bracelet-lune",
					status: "PUBLIC",
					_count: { skus: 2 },
					// Only 1 active SKU total (the one being deleted) → would leave 0 active
					skus: [{ id: VALID_CUID }],
				},
			}),
		);
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("PUBLIC");
	});

	it("should succeed and delete a SKU", async () => {
		const result = await deleteProductSku(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.$transaction).toHaveBeenCalled();
		expect(mockPrisma.productSku.delete).toHaveBeenCalledWith({ where: { id: VALID_CUID } });
	});

	// Depuis le remplacement d'`isDefault` par `position` (audit schéma V5, lot A2),
	// supprimer le représentant ne déclenche AUCUNE promotion : le rang 0 de
	// (position asc, id asc) est recalculé mécaniquement, la variante suivante
	// prend le relais sans écriture. Les anciens tests de promotion de flag
	// (fallback actif, refus du fallback inactif) testaient une machinerie disparue.
	it("supprime le représentant sans aucune écriture de promotion", async () => {
		const result = await deleteProductSku(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSku.delete).toHaveBeenCalledWith({ where: { id: VALID_CUID } });
		// Ni update (promotion de flag) ni findFirst (recherche de candidat).
		expect(mockPrisma.productSku.update).not.toHaveBeenCalled();
		expect(mockPrisma.productSku.findFirst).not.toHaveBeenCalled();
	});

	it("should call deleteUploadThingFilesFromUrls after DB delete", async () => {
		const images = [{ url: "https://ut.io/file1.jpg" }, { url: "https://ut.io/file2.jpg" }];
		mockPrisma.productSku.findUnique.mockResolvedValue(createMockSkuForDelete({ images }));
		await deleteProductSku(undefined, validFormData);
		expect(mockDeleteUploadThingFiles).toHaveBeenCalledWith([
			"https://ut.io/file1.jpg",
			"https://ut.io/file2.jpg",
		]);
	});

	it("should invalidate cache tags after successful delete", async () => {
		await deleteProductSku(undefined, validFormData);
		expect(mockGetSkuInvalidationTags).toHaveBeenCalled();
		expect(mockUpdateTag).toHaveBeenCalled();
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
		const result = await deleteProductSku(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	/**
	 * @regression delete-sku-race-recheck
	 *
	 * Un CartItem/OrderItem peut apparaître entre les checks pré-transaction
	 * (étapes 7-8, hors tx) et le DELETE. Le re-check au début du callback
	 * $transaction doit refuser avec un message métier explicite (BusinessError)
	 * au lieu de laisser la FK Restrict échouer en P2003 générique — et ne
	 * jamais atteindre productSku.delete.
	 */
	describe("re-check anti-race sous transaction", () => {
		// Le re-check PANIER sous transaction est parti avec la table CartItem
		// (2026-08-04) : il n'y a plus de FK Restrict dont anticiper le P2003.
		// Seul le re-check COMMANDE subsiste — c'est lui qui protège l'historique
		// comptable, et il est couvert juste en dessous.

		it("should return business error and skip delete when an order item appears mid-race", async () => {
			// Checks pré-tx verts (_count à 0), mais le re-check tx voit 1 commande
			mockPrisma.orderItem.count.mockResolvedValue(1);

			const result = await deleteProductSku(undefined, validFormData);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toContain("vient d'être associée à une commande");
			expect(mockPrisma.productSku.delete).not.toHaveBeenCalled();
		});
	});
});

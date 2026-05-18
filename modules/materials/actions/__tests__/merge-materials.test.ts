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
	mockNotFound,
	mockGetMaterialInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		material: {
			findUnique: vi.fn(),
			delete: vi.fn(),
		},
		productSku: {
			findMany: vi.fn(),
		},
		productSkuMaterial: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
			deleteMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockNotFound: vi.fn(),
	mockGetMaterialInvalidationTags: vi.fn(),
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
	ADMIN_MATERIAL_LIMITS: { MERGE: "material-merge" },
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	notFound: mockNotFound,
	BusinessError: class BusinessError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "BusinessError";
		}
	},
}));
vi.mock("../../schemas/materials.schemas", () => ({ mergeMaterialsSchema: {} }));
vi.mock("../../constants/cache", () => ({
	MATERIALS_CACHE_TAGS: {
		LIST: "materials-list",
		DETAIL: (slug: string) => `material-${slug}`,
	},
	getMaterialInvalidationTags: mockGetMaterialInvalidationTags,
}));

import { mergeMaterials } from "../merge-materials";

// ============================================================================
// HELPERS
// ============================================================================

function makeMaterial(overrides: Record<string, unknown> = {}) {
	return {
		id: "material-source",
		name: "Argent 925",
		slug: "argent-925",
		...overrides,
	};
}

const validFormData = createMockFormData({
	sourceId: "material-source",
	targetId: "material-target",
});

// ============================================================================
// TESTS
// ============================================================================

describe("mergeMaterials", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { sourceId: "material-source", targetId: "material-target" },
		});
		mockGetMaterialInvalidationTags.mockImplementation(
			(opts?: string | { slug?: string; affectedProductSlugs?: readonly string[] }) => {
				const tags = ["materials-list", "admin-badges"];
				const o = typeof opts === "string" ? { slug: opts } : (opts ?? {});
				if (o.slug) tags.push(`material-${o.slug}`);
				if (o.affectedProductSlugs?.length) {
					tags.push("products-list");
					for (const s of o.affectedProductSlugs) tags.push(`product-${s}`);
				}
				return tags;
			},
		);
		mockPrisma.productSku.findMany.mockResolvedValue([
			{ product: { slug: "bague-argent" } },
			{ product: { slug: "collier-argent" } },
		]);

		mockPrisma.material.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
			if (where.id === "material-source")
				return Promise.resolve(makeMaterial({ id: "material-source", slug: "argent-925" }));
			if (where.id === "material-target")
				return Promise.resolve(
					makeMaterial({
						id: "material-target",
						name: "Argent sterling",
						slug: "argent-sterling",
					}),
				);
			return Promise.resolve(null);
		});

		// Default: 3 SKUs liés au source, aucun déjà lié au target → réassignation simple.
		mockPrisma.productSkuMaterial.findMany.mockImplementation(
			({ where }: { where: { materialId: string; skuId?: { in: string[] } } }) => {
				if (where.materialId === "material-source") {
					return Promise.resolve([
						{ id: "link-1", skuId: "sku-1", position: 0 },
						{ id: "link-2", skuId: "sku-2", position: 0 },
						{ id: "link-3", skuId: "sku-3", position: 1 },
					]);
				}
				return Promise.resolve([]);
			},
		);
		mockPrisma.productSkuMaterial.updateMany.mockResolvedValue({ count: 3 });
		mockPrisma.productSkuMaterial.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.material.delete.mockResolvedValue({ id: "material-source" });
		mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
			fn(mockPrisma),
		);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockNotFound.mockImplementation((label: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${label} non trouvé`,
		}));
		mockHandleActionError.mockImplementation((e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: e instanceof Error && e.name === "BusinessError" ? e.message : fallback,
		}));
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns not found when source material is missing", async () => {
		mockPrisma.material.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
			if (where.id === "material-source") return Promise.resolve(null);
			return Promise.resolve(makeMaterial({ id: "material-target" }));
		});
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockNotFound).toHaveBeenCalledWith("Matériau source");
	});

	it("returns not found when target material is missing", async () => {
		mockPrisma.material.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
			if (where.id === "material-source")
				return Promise.resolve(makeMaterial({ id: "material-source" }));
			return Promise.resolve(null);
		});
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockNotFound).toHaveBeenCalledWith("Matériau cible");
	});

	it("silently drops collision links (when target already present on same SKU)", async () => {
		// sku-1 a déjà target → collision : on supprime le lien source, pas d'erreur.
		mockPrisma.productSkuMaterial.findMany.mockImplementation(
			({ where }: { where: { materialId: string; skuId?: { in: string[] } } }) => {
				if (where.materialId === "material-source") {
					return Promise.resolve([
						{ id: "link-1", skuId: "sku-1", position: 0 },
						{ id: "link-2", skuId: "sku-2", position: 0 },
					]);
				}
				return Promise.resolve([{ skuId: "sku-1" }]);
			},
		);
		mockPrisma.productSkuMaterial.updateMany.mockResolvedValue({ count: 1 });
		mockPrisma.productSkuMaterial.deleteMany.mockResolvedValue({ count: 1 });

		const result = await mergeMaterials(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSkuMaterial.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["link-1"] } },
		});
		expect(mockPrisma.productSkuMaterial.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["link-2"] } },
			data: { materialId: "material-target" },
		});
		expect(mockPrisma.material.delete).toHaveBeenCalledWith({ where: { id: "material-source" } });
	});

	it("reassigns SKU material links and deletes source material on success", async () => {
		const result = await mergeMaterials(undefined, validFormData);
		expect(mockPrisma.productSkuMaterial.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["link-1", "link-2", "link-3"] } },
			data: { materialId: "material-target" },
		});
		expect(mockPrisma.material.delete).toHaveBeenCalledWith({ where: { id: "material-source" } });
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("invalidates cache tags for list + both material details", async () => {
		await mergeMaterials(undefined, validFormData);
		const calls = mockUpdateTag.mock.calls.map((c: unknown[]) => c[0]);
		expect(calls).toContain("materials-list");
		expect(calls).toContain("material-argent-925");
		expect(calls).toContain("material-argent-sterling");
	});

	it("cascades invalidation to affected product PDPs", async () => {
		await mergeMaterials(undefined, validFormData);
		expect(mockPrisma.productSku.findMany).toHaveBeenCalledWith({
			where: { id: { in: ["sku-1", "sku-2", "sku-3"] }, deletedAt: null },
			select: { product: { select: { slug: true } } },
			distinct: ["productId"],
		});
		const calls = mockUpdateTag.mock.calls.map((c: unknown[]) => c[0]);
		expect(calls).toContain("product-bague-argent");
		expect(calls).toContain("product-collier-argent");
	});

	it("skips PDP cascade query when no SKU touched", async () => {
		mockPrisma.productSkuMaterial.findMany.mockResolvedValue([]);
		await mergeMaterials(undefined, validFormData);
		expect(mockPrisma.productSku.findMany).not.toHaveBeenCalled();
	});

	it("returns count in success data", async () => {
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.data).toMatchObject({ reassignedCount: 3, targetId: "material-target" });
	});

	it("handles merge with no SKU reassigned (orphan source)", async () => {
		mockPrisma.productSkuMaterial.findMany.mockResolvedValue([]);
		const result = await mergeMaterials(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("supprimé");
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.material.delete.mockRejectedValue(new Error("DB crash"));
		const result = await mergeMaterials(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

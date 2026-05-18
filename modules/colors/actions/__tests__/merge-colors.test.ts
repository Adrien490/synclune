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
	mockGetColorInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		color: {
			findUnique: vi.fn(),
			delete: vi.fn(),
		},
		productSku: {
			findMany: vi.fn(),
		},
		productSkuColor: {
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
	mockGetColorInvalidationTags: vi.fn(),
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
	ADMIN_COLOR_LIMITS: { MERGE: "color-merge" },
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
vi.mock("../../schemas/color.schemas", () => ({ mergeColorsSchema: {} }));
vi.mock("../../constants/cache", () => ({
	COLORS_CACHE_TAGS: {
		LIST: "colors-list",
		DETAIL: (slug: string) => `color-${slug}`,
	},
	getColorInvalidationTags: mockGetColorInvalidationTags,
}));

import { mergeColors } from "../merge-colors";

// ============================================================================
// HELPERS
// ============================================================================

function makeColor(overrides: Record<string, unknown> = {}) {
	return {
		id: "color-source",
		name: "Bleu ciel",
		slug: "bleu-ciel",
		...overrides,
	};
}

const validFormData = createMockFormData({
	sourceId: "color-source",
	targetId: "color-target",
});

// ============================================================================
// TESTS
// ============================================================================

describe("mergeColors", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { sourceId: "color-source", targetId: "color-target" },
		});
		mockGetColorInvalidationTags.mockImplementation(
			(opts?: { slug?: string; affectedProductSlugs?: readonly string[] }) => {
				const tags = ["colors-list", "admin-badges"];
				if (opts?.slug) tags.push(`color-${opts.slug}`);
				if (opts?.affectedProductSlugs?.length) {
					tags.push("products-list");
					for (const s of opts.affectedProductSlugs) tags.push(`product-${s}`);
				}
				return tags;
			},
		);
		mockPrisma.productSku.findMany.mockResolvedValue([
			{ product: { slug: "bague-or" } },
			{ product: { slug: "bracelet-argent" } },
		]);

		mockPrisma.color.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
			if (where.id === "color-source")
				return Promise.resolve(makeColor({ id: "color-source", slug: "bleu-ciel" }));
			if (where.id === "color-target")
				return Promise.resolve(makeColor({ id: "color-target", name: "Bleu", slug: "bleu" }));
			return Promise.resolve(null);
		});
		mockPrisma.productSkuColor.findMany.mockImplementation(
			({ where }: { where: { colorId: string } }) => {
				if (where.colorId === "color-source") {
					return Promise.resolve([
						{ id: "link-1", skuId: "sku-1", position: 0 },
						{ id: "link-2", skuId: "sku-2", position: 0 },
						{ id: "link-3", skuId: "sku-3", position: 0 },
					]);
				}
				return Promise.resolve([]);
			},
		);
		mockPrisma.productSkuColor.updateMany.mockResolvedValue({ count: 3 });
		mockPrisma.productSkuColor.deleteMany.mockResolvedValue({ count: 0 });
		mockPrisma.color.delete.mockResolvedValue({ id: "color-source" });
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
		const result = await mergeColors(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns rate limit error", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await mergeColors(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("returns validation error for invalid data", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Invalide" },
		});
		const result = await mergeColors(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("returns not found when source color is missing", async () => {
		mockPrisma.color.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
			if (where.id === "color-source") return Promise.resolve(null);
			return Promise.resolve(makeColor({ id: "color-target" }));
		});
		const result = await mergeColors(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockNotFound).toHaveBeenCalledWith("Couleur source");
	});

	it("returns not found when target color is missing", async () => {
		mockPrisma.color.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
			if (where.id === "color-source") return Promise.resolve(makeColor({ id: "color-source" }));
			return Promise.resolve(null);
		});
		const result = await mergeColors(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.NOT_FOUND);
		expect(mockNotFound).toHaveBeenCalledWith("Couleur cible");
	});

	it("rejects merge when SKU collisions would violate unique index", async () => {
		// M2M migration : les collisions ne lèvent plus d'erreur, les liens source
		// en collision avec un lien target existant sont supprimés (le target reste).
		mockPrisma.productSkuColor.findMany.mockImplementation(
			({ where }: { where: { colorId: string; skuId?: { in: string[] } } }) => {
				if (where.colorId === "color-source") {
					return Promise.resolve([
						{ id: "link-1", skuId: "sku-1", position: 0 },
						{ id: "link-2", skuId: "sku-2", position: 1 },
					]);
				}
				// target déjà présent sur sku-1 → collision
				return Promise.resolve([{ skuId: "sku-1" }]);
			},
		);
		const result = await mergeColors(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockPrisma.productSkuColor.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["link-1"] } },
		});
		expect(mockPrisma.productSkuColor.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["link-2"] } },
			data: { colorId: "color-target" },
		});
		expect(mockPrisma.color.delete).toHaveBeenCalled();
	});

	it("reassigns SKUs and deletes source color on success", async () => {
		const result = await mergeColors(undefined, validFormData);
		expect(mockPrisma.productSkuColor.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["link-1", "link-2", "link-3"] } },
			data: { colorId: "color-target" },
		});
		expect(mockPrisma.color.delete).toHaveBeenCalledWith({ where: { id: "color-source" } });
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("invalidates cache tags for list + both color details", async () => {
		await mergeColors(undefined, validFormData);
		const calls = mockUpdateTag.mock.calls.map((c: unknown[]) => c[0]);
		expect(calls).toContain("colors-list");
		expect(calls).toContain("color-bleu-ciel");
		expect(calls).toContain("color-bleu");
	});

	it("cascades invalidation to affected product PDPs (storefront swatch refresh)", async () => {
		await mergeColors(undefined, validFormData);
		expect(mockPrisma.productSku.findMany).toHaveBeenCalledWith({
			where: { id: { in: ["sku-1", "sku-2", "sku-3"] }, deletedAt: null },
			select: { product: { select: { slug: true } } },
			distinct: ["productId"],
		});
		const calls = mockUpdateTag.mock.calls.map((c: unknown[]) => c[0]);
		expect(calls).toContain("product-bague-or");
		expect(calls).toContain("product-bracelet-argent");
		expect(calls).toContain("products-list");
	});

	it("skips PDP cascade query when no SKU touched", async () => {
		mockPrisma.productSkuColor.findMany.mockResolvedValue([]);
		mockPrisma.productSkuColor.updateMany.mockResolvedValue({ count: 0 });
		await mergeColors(undefined, validFormData);
		expect(mockPrisma.productSku.findMany).not.toHaveBeenCalled();
	});

	it("returns count in success data", async () => {
		const result = await mergeColors(undefined, validFormData);
		expect(result.data).toMatchObject({ reassignedCount: 3, targetId: "color-target" });
	});

	it("handles merge with no SKU reassigned (orphan source)", async () => {
		mockPrisma.productSkuColor.findMany.mockResolvedValue([]);
		mockPrisma.productSkuColor.updateMany.mockResolvedValue({ count: 0 });
		const result = await mergeColors(undefined, validFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("supprimée");
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.color.delete.mockRejectedValue(new Error("DB crash"));
		const result = await mergeColors(undefined, validFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});

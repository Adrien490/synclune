import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockIsAdmin, mockCacheLife, mockCacheTag, mockSentry } = vi.hoisted(() => ({
	mockPrisma: {
		productType: { findUnique: vi.fn() },
	},
	mockIsAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockSentry: { captureException: vi.fn() },
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("@sentry/nextjs", () => mockSentry);

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
	updateTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	cacheProductTypes: () => {
		mockCacheLife("reference");
		mockCacheTag("product-types-list");
	},
	cacheProductTypesList: () => {
		mockCacheLife("user");
		mockCacheTag("product-types-list");
	},
	cacheProductTypesPublic: () => {
		mockCacheLife("reference");
		mockCacheTag("product-types-list");
	},
	cacheProductTypeDetail: (slug: string) => {
		mockCacheLife("user");
		mockCacheTag("product-types-list");
		mockCacheTag(`product-type-${slug}`);
	},
	cacheProductTypeCounts: (id: string) => {
		mockCacheLife("user");
		mockCacheTag(`product-type-${id}-counts`);
	},
}));

vi.mock("../../constants/product-type.constants", () => ({
	GET_PRODUCT_TYPE_SELECT: {
		id: true,
		slug: true,
		label: true,
		description: true,
		isActive: true,
		isSystem: true,
		createdAt: true,
		updatedAt: true,
		_count: {
			select: {
				products: {
					where: {
						status: "PUBLIC",
						deletedAt: null,
						skus: { some: { isActive: true } },
					},
				},
			},
		},
	},
	GET_PRODUCT_TYPES_DEFAULT_PER_PAGE: 20,
	GET_PRODUCT_TYPES_MAX_RESULTS_PER_PAGE: 200,
	GET_PRODUCT_TYPES_DEFAULT_SORT_BY: "label-ascending",
	GET_PRODUCT_TYPES_SORT_FIELDS: [
		"label-ascending",
		"label-descending",
		"products-ascending",
		"products-descending",
	],
}));

import { getProductTypeBySlug, getProductTypeDetailBySlug } from "../get-product-type";

// ============================================================================
// Factories
// ============================================================================

function makeProductType(overrides: Record<string, unknown> = {}) {
	return {
		id: "pt-1",
		slug: "bague",
		label: "Bague",
		description: "Bijou en anneau",
		isActive: true,
		isSystem: false,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		...overrides,
	};
}

// ============================================================================
// Tests: getProductTypeBySlug
// ============================================================================

describe("getProductTypeBySlug", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findUnique.mockResolvedValue(null);
	});

	it("returns null when slug is missing", async () => {
		const result = await getProductTypeBySlug({});

		expect(result).toBeNull();
		expect(mockPrisma.productType.findUnique).not.toHaveBeenCalled();
	});

	it("returns null when slug is empty string", async () => {
		const result = await getProductTypeBySlug({ slug: "" });

		expect(result).toBeNull();
		expect(mockPrisma.productType.findUnique).not.toHaveBeenCalled();
	});

	it("returns active product type for non-admin user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		const productType = makeProductType();
		mockPrisma.productType.findUnique.mockResolvedValue(productType);

		const result = await getProductTypeBySlug({ slug: "bague" });

		expect(result).toEqual(productType);
		expect(mockPrisma.productType.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { slug: "bague" },
			}),
		);
	});

	it("returns null for inactive product type when non-admin user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		const inactiveType = makeProductType({ isActive: false });
		mockPrisma.productType.findUnique.mockResolvedValue(inactiveType);

		const result = await getProductTypeBySlug({ slug: "bague" });

		expect(result).toBeNull();
	});

	it("returns inactive product type for admin with includeInactive=true", async () => {
		mockIsAdmin.mockResolvedValue(true);
		const inactiveType = makeProductType({ isActive: false });
		mockPrisma.productType.findUnique.mockResolvedValue(inactiveType);

		const result = await getProductTypeBySlug({ slug: "bague", includeInactive: true });

		expect(result).toEqual(inactiveType);
	});

	it("returns null for inactive type when admin but includeInactive is false", async () => {
		mockIsAdmin.mockResolvedValue(true);
		const inactiveType = makeProductType({ isActive: false });
		mockPrisma.productType.findUnique.mockResolvedValue(inactiveType);

		const result = await getProductTypeBySlug({ slug: "bague", includeInactive: false });

		expect(result).toBeNull();
	});

	it("returns null for inactive type when admin but includeInactive is not provided", async () => {
		mockIsAdmin.mockResolvedValue(true);
		const inactiveType = makeProductType({ isActive: false });
		mockPrisma.productType.findUnique.mockResolvedValue(inactiveType);

		const result = await getProductTypeBySlug({ slug: "bague" });

		expect(result).toBeNull();
	});

	it("queries by the correct slug", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findUnique.mockResolvedValue(null);

		await getProductTypeBySlug({ slug: "bracelet" });

		expect(mockPrisma.productType.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { slug: "bracelet" },
			}),
		);
	});

	it("returns null when product type is not found", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findUnique.mockResolvedValue(null);

		const result = await getProductTypeBySlug({ slug: "nonexistent" });

		expect(result).toBeNull();
	});

	it("calls cacheLife with user profile (cacheProductTypeDetail)", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findUnique.mockResolvedValue(makeProductType());

		await getProductTypeBySlug({ slug: "bague" });

		expect(mockCacheLife).toHaveBeenCalledWith("user");
	});

	it("calls cacheTag with both the list tag and the granular detail tag", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findUnique.mockResolvedValue(makeProductType());

		await getProductTypeBySlug({ slug: "bague" });

		expect(mockCacheTag).toHaveBeenCalledWith("product-types-list");
		expect(mockCacheTag).toHaveBeenCalledWith("product-type-bague");
	});

	it("rethrows on database error after capturing exception", async () => {
		mockIsAdmin.mockResolvedValue(false);
		const dbError = new Error("DB error");
		mockPrisma.productType.findUnique.mockRejectedValue(dbError);

		await expect(getProductTypeBySlug({ slug: "bague" })).rejects.toThrow("DB error");
		expect(mockSentry.captureException).toHaveBeenCalledWith(
			dbError,
			expect.objectContaining({
				tags: { module: "product-types", operation: "getProductType" },
			}),
		);
	});

	it("uses GET_PRODUCT_TYPE_SELECT for the DB query", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findUnique.mockResolvedValue(makeProductType());

		await getProductTypeBySlug({ slug: "bague" });

		expect(mockPrisma.productType.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					slug: true,
					label: true,
					description: true,
					isActive: true,
					isSystem: true,
					createdAt: true,
					updatedAt: true,
					_count: {
						select: {
							products: {
								where: {
									status: "PUBLIC",
									deletedAt: null,
									skus: { some: { isActive: true } },
								},
							},
						},
					},
				},
			}),
		);
	});
});

// ============================================================================
// Tests: getProductTypeDetailBySlug
// ============================================================================

/**
 * @regression catalog-selects-soft-delete
 *
 * Audit catalogue — le select inline de fetchProductTypeDetail (page admin
 * détail) doit filtrer les produits soft-deleted : sans `deletedAt: null` sur
 * `products.where`, la liste "5 derniers produits" affiche des produits
 * supprimés, et sans le même filtre sur `_count`, le total diverge de la somme
 * des counts par statut (getProductTypeProductCounts filtre déjà deletedAt).
 */
describe("getProductTypeDetailBySlug (@regression catalog-selects-soft-delete)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.productType.findUnique.mockResolvedValue(null);
	});

	it("returns null without querying when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		const result = await getProductTypeDetailBySlug({ slug: "bague" });

		expect(result).toBeNull();
		expect(mockPrisma.productType.findUnique).not.toHaveBeenCalled();
	});

	it("returns null without querying when slug is missing", async () => {
		const result = await getProductTypeDetailBySlug({});

		expect(result).toBeNull();
		expect(mockPrisma.productType.findUnique).not.toHaveBeenCalled();
	});

	it("filters soft-deleted products in the detail select (products.where)", async () => {
		await getProductTypeDetailBySlug({ slug: "bague" });

		expect(mockPrisma.productType.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { slug: "bague" },
				select: expect.objectContaining({
					products: expect.objectContaining({
						where: { deletedAt: null },
					}),
				}),
			}),
		);
	});

	it("filters soft-deleted products in the detail _count", async () => {
		await getProductTypeDetailBySlug({ slug: "bague" });

		expect(mockPrisma.productType.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: expect.objectContaining({
					_count: {
						select: {
							products: {
								where: { deletedAt: null },
							},
						},
					},
				}),
			}),
		);
	});
});

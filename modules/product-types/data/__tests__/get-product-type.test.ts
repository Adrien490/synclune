import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockIsAdmin, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		productType: { findFirst: vi.fn() },
	},
	mockIsAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

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

import { getProductTypeBySlug } from "../get-product-type";

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
		mockPrisma.productType.findFirst.mockResolvedValue(null);
	});

	it("returns null when slug is missing", async () => {
		const result = await getProductTypeBySlug({});

		expect(result).toBeNull();
		expect(mockPrisma.productType.findFirst).not.toHaveBeenCalled();
	});

	it("returns null when slug is empty string", async () => {
		const result = await getProductTypeBySlug({ slug: "" });

		expect(result).toBeNull();
		expect(mockPrisma.productType.findFirst).not.toHaveBeenCalled();
	});

	it("returns active product type for non-admin user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		const productType = makeProductType();
		mockPrisma.productType.findFirst.mockResolvedValue(productType);

		const result = await getProductTypeBySlug({ slug: "bague" });

		expect(result).toEqual(productType);
		expect(mockPrisma.productType.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { slug: "bague", isActive: true },
			}),
		);
	});

	it("filters by isActive=true for non-admin user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findFirst.mockResolvedValue(null);

		await getProductTypeBySlug({ slug: "bague" });

		expect(mockPrisma.productType.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isActive: true }),
			}),
		);
	});

	it("does not filter by isActive for admin with includeInactive=true", async () => {
		mockIsAdmin.mockResolvedValue(true);
		const inactiveType = makeProductType({ isActive: false });
		mockPrisma.productType.findFirst.mockResolvedValue(inactiveType);

		await getProductTypeBySlug({ slug: "bague", includeInactive: true });

		const call = mockPrisma.productType.findFirst.mock.calls[0]![0];
		expect(call.where).not.toHaveProperty("isActive");
	});

	it("still filters by isActive when admin but includeInactive is false", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.productType.findFirst.mockResolvedValue(null);

		await getProductTypeBySlug({ slug: "bague", includeInactive: false });

		expect(mockPrisma.productType.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isActive: true }),
			}),
		);
	});

	it("still filters by isActive when admin but includeInactive is not provided", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.productType.findFirst.mockResolvedValue(null);

		await getProductTypeBySlug({ slug: "bague" });

		expect(mockPrisma.productType.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isActive: true }),
			}),
		);
	});

	it("queries by the correct slug", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findFirst.mockResolvedValue(null);

		await getProductTypeBySlug({ slug: "bracelet" });

		expect(mockPrisma.productType.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ slug: "bracelet" }),
			}),
		);
	});

	it("returns null when product type is not found", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findFirst.mockResolvedValue(null);

		const result = await getProductTypeBySlug({ slug: "nonexistent" });

		expect(result).toBeNull();
	});

	it("calls cacheLife with reference profile", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findFirst.mockResolvedValue(makeProductType());

		await getProductTypeBySlug({ slug: "bague" });

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("calls cacheTag with the product-types list tag", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findFirst.mockResolvedValue(makeProductType());

		await getProductTypeBySlug({ slug: "bague" });

		expect(mockCacheTag).toHaveBeenCalledWith("product-types-list");
	});

	it("returns null on database error", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findFirst.mockRejectedValue(new Error("DB error"));

		const result = await getProductTypeBySlug({ slug: "bague" });

		expect(result).toBeNull();
	});

	it("uses GET_PRODUCT_TYPE_SELECT for the DB query", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.productType.findFirst.mockResolvedValue(makeProductType());

		await getProductTypeBySlug({ slug: "bague" });

		expect(mockPrisma.productType.findFirst).toHaveBeenCalledWith(
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
				},
			}),
		);
	});
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		productType: { findMany: vi.fn() },
	},
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
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

import { getProductTypeOptions } from "../get-product-type-options";

// ============================================================================
// Factories
// ============================================================================

function makeProductTypeOption(overrides: Record<string, unknown> = {}) {
	return {
		id: "pt-1",
		label: "Bague",
		...overrides,
	};
}

// ============================================================================
// Tests
// ============================================================================

describe("getProductTypeOptions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.productType.findMany.mockResolvedValue([]);
	});

	it("returns active product types ordered by label", async () => {
		const productTypes = [
			makeProductTypeOption({ id: "pt-1", label: "Bague" }),
			makeProductTypeOption({ id: "pt-2", label: "Collier" }),
		];
		mockPrisma.productType.findMany.mockResolvedValue(productTypes);

		const result = await getProductTypeOptions();

		expect(result).toEqual(productTypes);
	});

	it("queries only active product types", async () => {
		mockPrisma.productType.findMany.mockResolvedValue([]);

		await getProductTypeOptions();

		expect(mockPrisma.productType.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { isActive: true },
			}),
		);
	});

	it("selects only id and label fields", async () => {
		mockPrisma.productType.findMany.mockResolvedValue([]);

		await getProductTypeOptions();

		expect(mockPrisma.productType.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, label: true },
			}),
		);
	});

	it("orders results by label ascending", async () => {
		mockPrisma.productType.findMany.mockResolvedValue([]);

		await getProductTypeOptions();

		expect(mockPrisma.productType.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { label: "asc" },
			}),
		);
	});

	it("calls cacheLife with reference profile", async () => {
		mockPrisma.productType.findMany.mockResolvedValue([]);

		await getProductTypeOptions();

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("calls cacheTag with the product-types list tag", async () => {
		mockPrisma.productType.findMany.mockResolvedValue([]);

		await getProductTypeOptions();

		expect(mockCacheTag).toHaveBeenCalledWith("product-types-list");
	});

	it("returns empty array when no active product types exist", async () => {
		mockPrisma.productType.findMany.mockResolvedValue([]);

		const result = await getProductTypeOptions();

		expect(result).toEqual([]);
	});

	it("returns empty array on database error", async () => {
		mockPrisma.productType.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getProductTypeOptions();

		expect(result).toEqual([]);
	});

	it("does not require authentication", async () => {
		mockPrisma.productType.findMany.mockResolvedValue([makeProductTypeOption()]);

		const result = await getProductTypeOptions();

		expect(result).toHaveLength(1);
	});
});

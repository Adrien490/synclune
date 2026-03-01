import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		productSku: { findUnique: vi.fn() },
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

vi.mock("@/modules/products/constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		SKU_STOCK: (skuId: string) => `sku-stock-${skuId}`,
	},
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	STOCK_THRESHOLDS: {
		CRITICAL: 1,
		LOW: 3,
		NORMAL_MAX: 50,
	},
}));

import { getSkuStock } from "../get-sku-stock";

// ============================================================================
// Factories
// ============================================================================

function makeSkuRow(overrides: Record<string, unknown> = {}) {
	return {
		inventory: 10,
		isActive: true,
		...overrides,
	};
}

function setupDefaults() {
	mockPrisma.productSku.findUnique.mockResolvedValue(null);
}

// ============================================================================
// Tests: getSkuStock — input validation
// ============================================================================

describe("getSkuStock – input validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when skuId is an empty string", async () => {
		const result = await getSkuStock("");

		expect(result).toBeNull();
		expect(mockPrisma.productSku.findUnique).not.toHaveBeenCalled();
	});

	it("returns null when skuId is not a string (number cast)", async () => {
		// @ts-expect-error — intentionally passing wrong type to test the runtime guard
		const result = await getSkuStock(42);

		expect(result).toBeNull();
		expect(mockPrisma.productSku.findUnique).not.toHaveBeenCalled();
	});

	it("returns null when skuId is null", async () => {
		// @ts-expect-error — intentionally passing wrong type
		const result = await getSkuStock(null);

		expect(result).toBeNull();
		expect(mockPrisma.productSku.findUnique).not.toHaveBeenCalled();
	});

	it("returns null when skuId is undefined", async () => {
		// @ts-expect-error — intentionally passing wrong type
		const result = await getSkuStock(undefined);

		expect(result).toBeNull();
		expect(mockPrisma.productSku.findUnique).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Tests: getSkuStock — DB not found
// ============================================================================

describe("getSkuStock – DB not found", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaults();
	});

	it("returns null when SKU does not exist in DB", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(null);

		const result = await getSkuStock("sku-123");

		expect(result).toBeNull();
	});

	it("queries DB with correct where clause", async () => {
		await getSkuStock("sku-abc");

		expect(mockPrisma.productSku.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "sku-abc" },
			}),
		);
	});

	it("selects only inventory and isActive fields", async () => {
		await getSkuStock("sku-abc");

		expect(mockPrisma.productSku.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { inventory: true, isActive: true },
			}),
		);
	});
});

// ============================================================================
// Tests: getSkuStock — return shape
// ============================================================================

describe("getSkuStock – return shape", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns correct shape when stock is available and above low threshold", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuRow({ inventory: 10 }));

		const result = await getSkuStock("sku-1");

		expect(result).toEqual({
			available: 10,
			isInStock: true,
			isActive: true,
			lowStock: false,
		});
	});

	it("returns isInStock false when inventory is 0", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuRow({ inventory: 0 }));

		const result = await getSkuStock("sku-1");

		expect(result?.isInStock).toBe(false);
	});

	it("returns lowStock false when inventory is 0 (out of stock is not low stock)", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuRow({ inventory: 0 }));

		const result = await getSkuStock("sku-1");

		expect(result?.lowStock).toBe(false);
	});

	it("returns lowStock true when inventory equals LOW threshold (3)", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuRow({ inventory: 3 }));

		const result = await getSkuStock("sku-1");

		expect(result?.lowStock).toBe(true);
		expect(result?.isInStock).toBe(true);
	});

	it("returns lowStock true when inventory is 1 (critical level)", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuRow({ inventory: 1 }));

		const result = await getSkuStock("sku-1");

		expect(result?.lowStock).toBe(true);
		expect(result?.isInStock).toBe(true);
	});

	it("returns lowStock false when inventory is 4 (above LOW threshold)", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuRow({ inventory: 4 }));

		const result = await getSkuStock("sku-1");

		expect(result?.lowStock).toBe(false);
	});

	it("reflects isActive false when SKU is inactive", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(
			makeSkuRow({ inventory: 5, isActive: false }),
		);

		const result = await getSkuStock("sku-1");

		expect(result?.isActive).toBe(false);
	});

	it("sets available to the raw inventory value", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuRow({ inventory: 42 }));

		const result = await getSkuStock("sku-1");

		expect(result?.available).toBe(42);
	});
});

// ============================================================================
// Tests: getSkuStock — cache directives
// ============================================================================

describe("getSkuStock – cache directives", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuRow());
	});

	it("calls cacheLife with 'skuStock' profile", async () => {
		await getSkuStock("sku-1");

		expect(mockCacheLife).toHaveBeenCalledWith("skuStock");
	});

	it("calls cacheTag with the SKU-specific stock tag", async () => {
		await getSkuStock("sku-xyz");

		expect(mockCacheTag).toHaveBeenCalledWith("sku-stock-sku-xyz");
	});
});

// ============================================================================
// Tests: getSkuStock — error handling
// ============================================================================

describe("getSkuStock – error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when Prisma throws", async () => {
		mockPrisma.productSku.findUnique.mockRejectedValue(new Error("DB connection error"));

		const result = await getSkuStock("sku-1");

		expect(result).toBeNull();
	});
});

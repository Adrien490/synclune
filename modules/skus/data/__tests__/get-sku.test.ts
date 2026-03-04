import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockIsAdmin, mockCacheLife, mockCacheTag, mockCacheSkuDetailById } = vi.hoisted(
	() => ({
		mockPrisma: {
			productSku: { findUnique: vi.fn() },
		},
		mockIsAdmin: vi.fn(),
		mockCacheLife: vi.fn(),
		mockCacheTag: vi.fn(),
		mockCacheSkuDetailById: vi.fn(),
	}),
);

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

vi.mock("../../utils/cache.utils", () => ({
	cacheSkuDetailById: mockCacheSkuDetailById,
}));

vi.mock("../../constants/sku.constants", () => ({
	GET_PRODUCT_SKU_SELECT: { id: true, sku: true, inventory: true, isActive: true },
}));

import { getSkuById } from "../get-sku";

// ============================================================================
// Factories
// ============================================================================

function makeSkuRecord(overrides: Record<string, unknown> = {}) {
	return {
		id: "sku-id-1",
		sku: "SKU-001",
		inventory: 5,
		isActive: true,
		...overrides,
	};
}

function makeSkuWithImages(overrides: Record<string, unknown> = {}) {
	return {
		...makeSkuRecord(),
		compareAtPrice: null,
		images: [],
		...overrides,
	};
}

// ============================================================================
// Tests: getSkuById
// ============================================================================

describe("getSkuById", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.productSku.findUnique.mockResolvedValue(null);
	});

	it("returns null when skuId is an empty string", async () => {
		const result = await getSkuById("");

		expect(result).toBeNull();
		expect(mockIsAdmin).not.toHaveBeenCalled();
	});

	it("returns null when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		const result = await getSkuById("sku-id-1");

		expect(result).toBeNull();
		expect(mockPrisma.productSku.findUnique).not.toHaveBeenCalled();
	});

	it("checks admin access before hitting the DB", async () => {
		await getSkuById("sku-id-1");

		expect(mockIsAdmin).toHaveBeenCalledOnce();
	});

	it("returns null when SKU is not found", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(null);

		const result = await getSkuById("sku-id-missing");

		expect(result).toBeNull();
	});

	it("queries by id with correct where clause", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuWithImages());

		await getSkuById("sku-id-1");

		expect(mockPrisma.productSku.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "sku-id-1" },
			}),
		);
	});

	it("includes images in the select", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuWithImages());

		await getSkuById("sku-id-1");

		const callArg = mockPrisma.productSku.findUnique.mock.calls[0]![0];
		expect(callArg.select).toHaveProperty("images");
	});

	it("includes compareAtPrice in the select", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuWithImages());

		await getSkuById("sku-id-1");

		const callArg = mockPrisma.productSku.findUnique.mock.calls[0]![0];
		expect(callArg.select).toHaveProperty("compareAtPrice", true);
	});

	it("returns the SKU with images when found", async () => {
		const skuWithImages = makeSkuWithImages({
			images: [{ id: "img-1", url: "https://example.com/img.jpg", isPrimary: true }],
		});
		mockPrisma.productSku.findUnique.mockResolvedValue(skuWithImages);

		const result = await getSkuById("sku-id-1");

		expect(result).toEqual(skuWithImages);
	});

	it("calls cacheSkuDetailById with the skuId", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuWithImages());

		await getSkuById("sku-id-1");

		expect(mockCacheSkuDetailById).toHaveBeenCalledWith("sku-id-1");
	});

	it("returns null when Prisma throws", async () => {
		mockPrisma.productSku.findUnique.mockRejectedValue(new Error("DB error"));

		const result = await getSkuById("sku-id-1");

		expect(result).toBeNull();
	});
});

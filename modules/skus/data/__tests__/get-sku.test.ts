import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockIsAdmin, mockCacheLife, mockCacheTag, mockCacheSkuDetail } = vi.hoisted(
	() => ({
		mockPrisma: {
			productSku: { findUnique: vi.fn() },
		},
		mockIsAdmin: vi.fn(),
		mockCacheLife: vi.fn(),
		mockCacheTag: vi.fn(),
		mockCacheSkuDetail: vi.fn(),
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
	cacheSkuDetail: mockCacheSkuDetail,
}));

vi.mock("../../constants/sku.constants", () => ({
	GET_PRODUCT_SKU_SELECT: { id: true, sku: true, inventory: true, isActive: true },
}));

vi.mock("../../schemas/sku.schemas", () => ({
	getProductSkuSchema: {
		safeParse: (data: unknown) => {
			const input = data as Record<string, unknown>;
			if (typeof input.sku === "string" && input.sku.trim().length > 0) {
				return { success: true, data: { sku: input.sku } };
			}
			return { success: false, error: { errors: [{ message: "sku required" }] } };
		},
	},
}));

import { getSkuByCode, getSkuById } from "../get-sku";

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
// Tests: getSkuByCode
// ============================================================================

describe("getSkuByCode", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.productSku.findUnique.mockResolvedValue(null);
	});

	it("returns null when params fail schema validation (missing sku)", async () => {
		const result = await getSkuByCode({});

		expect(result).toBeNull();
		expect(mockIsAdmin).not.toHaveBeenCalled();
	});

	it("returns null when params fail schema validation (empty sku)", async () => {
		const result = await getSkuByCode({ sku: "" });

		expect(result).toBeNull();
		expect(mockIsAdmin).not.toHaveBeenCalled();
	});

	it("returns null when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		const result = await getSkuByCode({ sku: "SKU-001" });

		expect(result).toBeNull();
		expect(mockPrisma.productSku.findUnique).not.toHaveBeenCalled();
	});

	it("calls isAdmin before hitting the DB", async () => {
		await getSkuByCode({ sku: "SKU-001" });

		expect(mockIsAdmin).toHaveBeenCalledOnce();
	});

	it("returns null when SKU does not exist in DB", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(null);

		const result = await getSkuByCode({ sku: "SKU-MISSING" });

		expect(result).toBeNull();
	});

	it("queries DB by sku code with correct where clause", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuRecord());

		await getSkuByCode({ sku: "SKU-001" });

		expect(mockPrisma.productSku.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { sku: "SKU-001" },
			}),
		);
	});

	it("returns the SKU record when found", async () => {
		const sku = makeSkuRecord();
		mockPrisma.productSku.findUnique.mockResolvedValue(sku);

		const result = await getSkuByCode({ sku: "SKU-001" });

		expect(result).toEqual(sku);
	});

	it("calls cacheSkuDetail with the sku code", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuRecord());

		await getSkuByCode({ sku: "SKU-001" });

		expect(mockCacheSkuDetail).toHaveBeenCalledWith("SKU-001");
	});

	it("returns null when Prisma throws", async () => {
		mockPrisma.productSku.findUnique.mockRejectedValue(new Error("DB error"));

		const result = await getSkuByCode({ sku: "SKU-001" });

		expect(result).toBeNull();
	});
});

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

	it("calls cacheSkuDetail with the skuId", async () => {
		mockPrisma.productSku.findUnique.mockResolvedValue(makeSkuWithImages());

		await getSkuById("sku-id-1");

		expect(mockCacheSkuDetail).toHaveBeenCalledWith("sku-id-1");
	});

	it("returns null when Prisma throws", async () => {
		mockPrisma.productSku.findUnique.mockRejectedValue(new Error("DB error"));

		const result = await getSkuById("sku-id-1");

		expect(result).toBeNull();
	});
});

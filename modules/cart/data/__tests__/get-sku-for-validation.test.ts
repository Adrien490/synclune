import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_SKU_ID, VALID_CUID, VALID_CUID_2 } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockFindUnique, mockFindMany, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockFindUnique: vi.fn(),
	mockFindMany: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		productSku: {
			findUnique: mockFindUnique,
			findMany: mockFindMany,
		},
	},
}));

import { fetchSkuForValidation, fetchSkusForBatchValidation } from "../get-sku-for-validation";

// ============================================================================
// FACTORIES
// ============================================================================

function createMockSkuForValidation(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_SKU_ID,
		sku: "BRC-LUNE-OR-M",
		priceInclTax: 4999,
		compareAtPrice: null,
		inventory: 10,
		isActive: true,
		size: "M",
		deletedAt: null,
		product: {
			id: "prod_123",
			title: "Bracelet Lune",
			slug: "bracelet-lune",
			status: "PUBLIC",
			description: "Un bracelet artisanal",
			deletedAt: null,
		},
		images: [{ url: "https://cdn.example.com/img.jpg", altText: "Bracelet", isPrimary: true }],
		colors: [
			{
				colorId: "color_123",
				position: 0,
				color: { id: "color_123", name: "Or", hex: "#FFD700" },
			},
		],
		materials: [
			{
				materialId: "mat_123",
				position: 0,
				material: { id: "mat_123", name: "Argent 925" },
			},
		],
		...overrides,
	};
}

function createMockBatchSku(id: string, overrides: Record<string, unknown> = {}) {
	return {
		id,
		inventory: 5,
		isActive: true,
		deletedAt: null,
		product: {
			status: "PUBLIC",
			deletedAt: null,
		},
		...overrides,
	};
}

// ============================================================================
// TESTS: fetchSkuForValidation
// ============================================================================

describe("fetchSkuForValidation", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockFindUnique.mockResolvedValue(createMockSkuForValidation());
	});

	it("calls prisma.productSku.findUnique with the given skuId", async () => {
		await fetchSkuForValidation(VALID_SKU_ID);

		expect(mockFindUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_SKU_ID },
			}),
		);
	});

	it("returns the SKU with full relations when found", async () => {
		const result = await fetchSkuForValidation(VALID_SKU_ID);

		expect(result).not.toBeNull();
		expect(result?.id).toBe(VALID_SKU_ID);
		expect(result?.product).toBeDefined();
		expect(result?.images).toBeInstanceOf(Array);
		expect(result?.colors).toBeDefined();
		expect(result?.materials).toBeDefined();
	});

	it("returns null when SKU is not found", async () => {
		mockFindUnique.mockResolvedValue(null);

		const result = await fetchSkuForValidation("nonexistent-sku");

		expect(result).toBeNull();
	});

	it("selects id, sku, priceInclTax, compareAtPrice, inventory, isActive, size, deletedAt", async () => {
		await fetchSkuForValidation(VALID_SKU_ID);

		const callArg = mockFindUnique.mock.calls[0]![0];
		expect(callArg.select).toMatchObject({
			id: true,
			sku: true,
			priceInclTax: true,
			compareAtPrice: true,
			inventory: true,
			isActive: true,
			size: true,
			deletedAt: true,
		});
	});

	it("selects product with status and deletedAt for soft-delete checking", async () => {
		await fetchSkuForValidation(VALID_SKU_ID);

		const callArg = mockFindUnique.mock.calls[0]![0];
		expect(callArg.select.product.select).toMatchObject({
			status: true,
			deletedAt: true,
		});
	});

	// EINV-SNAPSHOT-MEDIA-001 : l'ordre `createdAt: asc` rendait l'ordre d'UPLOAD, pas
	// l'ordre d'AFFICHAGE. Ce select alimente le snapshot figé `OrderItem` (facture,
	// rétention 10 ans) : il doit reproduire la priorité de `pickPrimaryImage`.
	it("orders images by primary first, then position (pickPrimaryImage parity)", async () => {
		await fetchSkuForValidation(VALID_SKU_ID);

		const callArg = mockFindUnique.mock.calls[0]![0];
		expect(callArg.select.images.orderBy).toEqual([
			{ isPrimary: "desc" },
			{ position: "asc" },
			{ id: "asc" },
		]);
	});

	// `mediaType` est le champ qui permet à l'appelant d'écarter une vidéo. Sans lui,
	// un `.mp4` se figeait dans `productImageUrl` / `skuImageUrl`.
	it("selects mediaType so the caller can exclude videos", async () => {
		await fetchSkuForValidation(VALID_SKU_ID);

		const callArg = mockFindUnique.mock.calls[0]![0];
		expect(callArg.select.images.select.mediaType).toBe(true);
	});

	it("returns SKU with inventory count for stock validation", async () => {
		const skuWithStock = createMockSkuForValidation({ inventory: 3 });
		mockFindUnique.mockResolvedValue(skuWithStock);

		const result = await fetchSkuForValidation(VALID_SKU_ID);

		expect(result?.inventory).toBe(3);
	});

	it("returns SKU with deletedAt for soft-delete validation", async () => {
		const deletedSku = createMockSkuForValidation({ deletedAt: new Date("2026-01-01") });
		mockFindUnique.mockResolvedValue(deletedSku);

		const result = await fetchSkuForValidation(VALID_SKU_ID);

		expect(result?.deletedAt).toBeInstanceOf(Date);
	});
});

// ============================================================================
// TESTS: fetchSkusForBatchValidation
// ============================================================================

describe("fetchSkusForBatchValidation", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockFindMany.mockResolvedValue([
			createMockBatchSku(VALID_CUID),
			createMockBatchSku(VALID_CUID_2),
		]);
	});

	it("calls prisma.productSku.findMany with the given skuIds", async () => {
		await fetchSkusForBatchValidation([VALID_CUID, VALID_CUID_2]);

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: [VALID_CUID, VALID_CUID_2] } },
			}),
		);
	});

	it("returns the list of matching SKUs", async () => {
		const result = await fetchSkusForBatchValidation([VALID_CUID, VALID_CUID_2]);

		expect(result).toHaveLength(2);
		expect(result[0]!.id).toBe(VALID_CUID);
		expect(result[1]!.id).toBe(VALID_CUID_2);
	});

	it("returns empty array when no SKUs match", async () => {
		mockFindMany.mockResolvedValue([]);

		const result = await fetchSkusForBatchValidation(["nonexistent"]);

		expect(result).toHaveLength(0);
	});

	it("selects only fields needed for batch validation (id, inventory, isActive, deletedAt, product)", async () => {
		await fetchSkusForBatchValidation([VALID_CUID]);

		const callArg = mockFindMany.mock.calls[0]![0];
		expect(callArg.select).toMatchObject({
			id: true,
			inventory: true,
			isActive: true,
			deletedAt: true,
		});
		expect(callArg.select.product).toBeDefined();
	});

	it("does not select images or color for batch (lightweight query)", async () => {
		await fetchSkusForBatchValidation([VALID_CUID]);

		const callArg = mockFindMany.mock.calls[0]![0];
		expect(callArg.select.images).toBeUndefined();
		expect(callArg.select.color).toBeUndefined();
	});

	it("handles empty skuIds array", async () => {
		mockFindMany.mockResolvedValue([]);

		const result = await fetchSkusForBatchValidation([]);

		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: [] } },
			}),
		);
		expect(result).toHaveLength(0);
	});
});

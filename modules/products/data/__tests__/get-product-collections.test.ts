import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockProductCollectionFindMany, mockCollectionFindMany, mockCacheLife, mockCacheTag } =
	vi.hoisted(() => ({
		mockProductCollectionFindMany: vi.fn(),
		mockCollectionFindMany: vi.fn(),
		mockCacheLife: vi.fn(),
		mockCacheTag: vi.fn(),
	}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		productCollection: { findMany: mockProductCollectionFindMany },
		collection: { findMany: mockCollectionFindMany },
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

vi.mock("@/modules/collections/constants/cache", () => ({
	COLLECTIONS_CACHE_TAGS: {
		LIST: "collections-list",
	},
}));

import { getProductCollections, getAllCollections } from "../get-product-collections";

// ============================================================================
// TESTS
// ============================================================================

describe("getProductCollections", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("returns mapped collections for a product", async () => {
		mockProductCollectionFindMany.mockResolvedValue([
			{ collection: { id: "col-1", name: "Printemps" } },
			{ collection: { id: "col-2", name: "Été" } },
		]);

		const result = await getProductCollections("prod-1");

		expect(result).toEqual([
			{ id: "col-1", name: "Printemps" },
			{ id: "col-2", name: "Été" },
		]);
	});

	it("queries by productId", async () => {
		mockProductCollectionFindMany.mockResolvedValue([]);

		await getProductCollections("prod-42");

		expect(mockProductCollectionFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { productId: "prod-42" },
			}),
		);
	});

	it("returns empty array when product has no collections", async () => {
		mockProductCollectionFindMany.mockResolvedValue([]);

		const result = await getProductCollections("prod-1");

		expect(result).toEqual([]);
	});

	it("calls cacheLife with products profile", async () => {
		mockProductCollectionFindMany.mockResolvedValue([]);

		await getProductCollections("prod-1");

		expect(mockCacheLife).toHaveBeenCalledWith("products");
	});

	it("calls cacheTag with collections-list tag", async () => {
		mockProductCollectionFindMany.mockResolvedValue([]);

		await getProductCollections("prod-1");

		expect(mockCacheTag).toHaveBeenCalledWith("collections-list");
	});
});

describe("getAllCollections", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("returns all collections sorted by name", async () => {
		const collections = [
			{ id: "col-1", name: "Automne" },
			{ id: "col-2", name: "Été" },
			{ id: "col-3", name: "Printemps" },
		];
		mockCollectionFindMany.mockResolvedValue(collections);

		const result = await getAllCollections();

		expect(result).toEqual(collections);
	});

	it("queries with orderBy name asc", async () => {
		mockCollectionFindMany.mockResolvedValue([]);

		await getAllCollections();

		expect(mockCollectionFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { name: "asc" },
			}),
		);
	});

	it("returns empty array when no collections exist", async () => {
		mockCollectionFindMany.mockResolvedValue([]);

		const result = await getAllCollections();

		expect(result).toEqual([]);
	});

	it("calls cacheLife with collections profile", async () => {
		mockCollectionFindMany.mockResolvedValue([]);

		await getAllCollections();

		expect(mockCacheLife).toHaveBeenCalledWith("collections");
	});

	it("calls cacheTag with collections-list tag", async () => {
		mockCollectionFindMany.mockResolvedValue([]);

		await getAllCollections();

		expect(mockCacheTag).toHaveBeenCalledWith("collections-list");
	});
});

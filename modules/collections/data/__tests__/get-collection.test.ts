import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockFindUnique,
	mockCacheCollectionDetail,
	mockGetCollectionSelect,
	mockGetCollectionStorefrontSelect,
	mockSafeParse,
} = vi.hoisted(() => ({
	mockFindUnique: vi.fn(),
	mockCacheCollectionDetail: vi.fn(),
	mockGetCollectionSelect: { id: true, name: true },
	mockGetCollectionStorefrontSelect: { id: true, slug: true },
	mockSafeParse: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		collection: { findUnique: mockFindUnique },
	},
}));

vi.mock("../../utils/cache.utils", () => ({
	cacheCollectionDetail: mockCacheCollectionDetail,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	CollectionStatus: { PUBLIC: "PUBLIC", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" },
}));

vi.mock("../../constants/collection.constants", () => ({
	GET_COLLECTION_SELECT: mockGetCollectionSelect,
	GET_COLLECTION_STOREFRONT_SELECT: mockGetCollectionStorefrontSelect,
}));

vi.mock("../../schemas/collection.schemas", () => ({
	getCollectionSchema: { safeParse: mockSafeParse },
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

import { getCollectionBySlug, getStorefrontCollectionBySlug } from "../get-collection";

// ============================================================================
// Factories
// ============================================================================

function makeCollection(overrides: Record<string, unknown> = {}) {
	return {
		id: "col-1",
		name: "Test Collection",
		slug: "test-collection",
		...overrides,
	};
}

function makeStorefrontCollection(overrides: Record<string, unknown> = {}) {
	return {
		id: "col-1",
		slug: "test-collection",
		...overrides,
	};
}

// ============================================================================
// Tests: getCollectionBySlug
// ============================================================================

describe("getCollectionBySlug", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSafeParse.mockReturnValue({ success: true, data: { slug: "test-collection" } });
		mockFindUnique.mockResolvedValue(null);
	});

	it("returns null for invalid params", async () => {
		// Arrange
		mockSafeParse.mockReturnValue({ success: false, error: { errors: [] } });

		// Act
		const result = await getCollectionBySlug({});

		// Assert
		expect(result).toBeNull();
		expect(mockFindUnique).not.toHaveBeenCalled();
	});

	it("returns collection for valid slug", async () => {
		// Arrange
		const collection = makeCollection();
		mockFindUnique.mockResolvedValue(collection);

		// Act
		const result = await getCollectionBySlug({ slug: "test-collection" });

		// Assert
		expect(result).toEqual(collection);
	});

	it("returns null when collection not found", async () => {
		// Arrange
		mockFindUnique.mockResolvedValue(null);

		// Act
		const result = await getCollectionBySlug({ slug: "non-existent" });

		// Assert
		expect(result).toBeNull();
	});

	it("calls cacheCollectionDetail with slug", async () => {
		// Arrange
		mockSafeParse.mockReturnValue({ success: true, data: { slug: "my-slug" } });
		mockFindUnique.mockResolvedValue(makeCollection());

		// Act
		await getCollectionBySlug({ slug: "my-slug" });

		// Assert
		expect(mockCacheCollectionDetail).toHaveBeenCalledWith("my-slug");
	});

	it("uses GET_COLLECTION_SELECT in the DB query", async () => {
		// Arrange
		mockFindUnique.mockResolvedValue(makeCollection());

		// Act
		await getCollectionBySlug({ slug: "test-collection" });

		// Assert
		expect(mockFindUnique).toHaveBeenCalledWith(
			expect.objectContaining({ select: mockGetCollectionSelect }),
		);
	});

	it("queries by slug", async () => {
		// Arrange
		mockSafeParse.mockReturnValue({ success: true, data: { slug: "bagues" } });
		mockFindUnique.mockResolvedValue(makeCollection({ slug: "bagues" }));

		// Act
		await getCollectionBySlug({ slug: "bagues" });

		// Assert
		expect(mockFindUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { slug: "bagues" } }),
		);
	});

	it("returns null on DB error", async () => {
		// Arrange
		mockFindUnique.mockRejectedValue(new Error("DB connection failed"));

		// Act
		const result = await getCollectionBySlug({ slug: "test-collection" });

		// Assert
		expect(result).toBeNull();
	});
});

// ============================================================================
// Tests: getStorefrontCollectionBySlug
// ============================================================================

describe("getStorefrontCollectionBySlug", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSafeParse.mockReturnValue({ success: true, data: { slug: "test-collection" } });
		mockFindUnique.mockResolvedValue(null);
	});

	it("returns null for invalid params", async () => {
		// Arrange
		mockSafeParse.mockReturnValue({ success: false, error: { errors: [] } });

		// Act
		const result = await getStorefrontCollectionBySlug({});

		// Assert
		expect(result).toBeNull();
		expect(mockFindUnique).not.toHaveBeenCalled();
	});

	it("returns lightweight collection data for valid slug", async () => {
		// Arrange
		const collection = makeStorefrontCollection();
		mockFindUnique.mockResolvedValue(collection);

		// Act
		const result = await getStorefrontCollectionBySlug({ slug: "test-collection" });

		// Assert
		expect(result).toEqual(collection);
	});

	it("returns null on DB error", async () => {
		// Arrange
		mockFindUnique.mockRejectedValue(new Error("Timeout"));

		// Act
		const result = await getStorefrontCollectionBySlug({ slug: "test-collection" });

		// Assert
		expect(result).toBeNull();
	});

	it("uses GET_COLLECTION_STOREFRONT_SELECT in the DB query", async () => {
		// Arrange
		mockFindUnique.mockResolvedValue(makeStorefrontCollection());

		// Act
		await getStorefrontCollectionBySlug({ slug: "test-collection" });

		// Assert
		expect(mockFindUnique).toHaveBeenCalledWith(
			expect.objectContaining({ select: mockGetCollectionStorefrontSelect }),
		);
	});

	it("calls cacheCollectionDetail with slug", async () => {
		// Arrange
		mockSafeParse.mockReturnValue({ success: true, data: { slug: "colliers" } });
		mockFindUnique.mockResolvedValue(makeStorefrontCollection({ slug: "colliers" }));

		// Act
		await getStorefrontCollectionBySlug({ slug: "colliers" });

		// Assert
		expect(mockCacheCollectionDetail).toHaveBeenCalledWith("colliers");
	});

	it("returns null when storefront collection not found", async () => {
		// Arrange
		mockFindUnique.mockResolvedValue(null);

		// Act
		const result = await getStorefrontCollectionBySlug({ slug: "ghost-collection" });

		// Assert
		expect(result).toBeNull();
	});

	it("filters by PUBLIC status in the DB query", async () => {
		// Arrange
		mockSafeParse.mockReturnValue({ success: true, data: { slug: "draft-collection" } });
		mockFindUnique.mockResolvedValue(null);

		// Act
		await getStorefrontCollectionBySlug({ slug: "draft-collection" });

		// Assert
		expect(mockFindUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { slug: "draft-collection", status: "PUBLIC" },
			}),
		);
	});
});

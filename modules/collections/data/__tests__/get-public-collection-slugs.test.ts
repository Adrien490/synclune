import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockFindMany } = vi.hoisted(() => ({
	mockFindMany: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		collection: { findMany: mockFindMany },
	},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	CollectionStatus: { DRAFT: "DRAFT", PUBLIC: "PUBLIC", ARCHIVED: "ARCHIVED" },
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

import { getPublicCollectionSlugs } from "../get-public-collection-slugs";

// ============================================================================
// Tests: getPublicCollectionSlugs
// ============================================================================

describe("getPublicCollectionSlugs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindMany.mockResolvedValue([]);
	});

	it("returns slugs of public collections", async () => {
		// Arrange
		const slugs = [{ slug: "bagues" }, { slug: "colliers" }];
		mockFindMany.mockResolvedValue(slugs);

		// Act
		const result = await getPublicCollectionSlugs();

		// Assert
		expect(result).toEqual(slugs);
	});

	it("filters by PUBLIC status only", async () => {
		// Act
		await getPublicCollectionSlugs();

		// Assert
		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { status: "PUBLIC" },
			}),
		);
	});

	it("selects only slug field", async () => {
		// Act
		await getPublicCollectionSlugs();

		// Assert
		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { slug: true },
			}),
		);
	});

	it("returns empty array on DB error", async () => {
		// Arrange
		mockFindMany.mockRejectedValue(new Error("DB unavailable"));

		// Act
		const result = await getPublicCollectionSlugs();

		// Assert
		expect(result).toEqual([]);
	});

	it("returns empty array when no public collections exist", async () => {
		// Arrange
		mockFindMany.mockResolvedValue([]);

		// Act
		const result = await getPublicCollectionSlugs();

		// Assert
		expect(result).toEqual([]);
	});
});

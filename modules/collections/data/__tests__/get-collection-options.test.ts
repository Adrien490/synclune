import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockFindMany,
	mockCacheCollections,
} = vi.hoisted(() => ({
	mockFindMany: vi.fn(),
	mockCacheCollections: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		collection: { findMany: mockFindMany },
	},
}));

vi.mock("../../utils/cache.utils", () => ({
	cacheCollections: mockCacheCollections,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	CollectionStatus: { DRAFT: "DRAFT", PUBLIC: "PUBLIC", ARCHIVED: "ARCHIVED" },
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

import { getCollectionOptions } from "../get-collection-options";

// ============================================================================
// Factories
// ============================================================================

function makeCollectionOption(overrides: Record<string, unknown> = {}) {
	return {
		id: "col-1",
		name: "Bagues",
		...overrides,
	};
}

// ============================================================================
// Tests: getCollectionOptions
// ============================================================================

describe("getCollectionOptions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFindMany.mockResolvedValue([]);
	});

	it("returns collections list", async () => {
		// Arrange
		const options = [
			makeCollectionOption({ id: "col-1", name: "Bagues" }),
			makeCollectionOption({ id: "col-2", name: "Colliers" }),
		];
		mockFindMany.mockResolvedValue(options);

		// Act
		const result = await getCollectionOptions();

		// Assert
		expect(result).toEqual(options);
	});

	it("filters collections by DRAFT and PUBLIC status only", async () => {
		// Arrange
		mockFindMany.mockResolvedValue([]);

		// Act
		await getCollectionOptions();

		// Assert
		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					status: {
						in: expect.arrayContaining(["DRAFT", "PUBLIC"]),
					},
				},
			})
		);
	});

	it("does not include ARCHIVED status in the filter", async () => {
		// Arrange
		mockFindMany.mockResolvedValue([]);

		// Act
		await getCollectionOptions();

		// Assert
		const callArg = mockFindMany.mock.calls[0][0];
		expect(callArg.where.status.in).not.toContain("ARCHIVED");
	});

	it("orders results by name ascending", async () => {
		// Arrange
		mockFindMany.mockResolvedValue([]);

		// Act
		await getCollectionOptions();

		// Assert
		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { name: "asc" },
			})
		);
	});

	it("selects only id and name fields", async () => {
		// Arrange
		mockFindMany.mockResolvedValue([]);

		// Act
		await getCollectionOptions();

		// Assert
		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, name: true },
			})
		);
	});

	it("returns empty array on DB error", async () => {
		// Arrange
		mockFindMany.mockRejectedValue(new Error("DB unavailable"));

		// Act
		const result = await getCollectionOptions();

		// Assert
		expect(result).toEqual([]);
	});

	it("calls cacheCollections", async () => {
		// Arrange
		mockFindMany.mockResolvedValue([]);

		// Act
		await getCollectionOptions();

		// Assert
		expect(mockCacheCollections).toHaveBeenCalledOnce();
	});

	it("returns empty array when no collections exist", async () => {
		// Arrange
		mockFindMany.mockResolvedValue([]);

		// Act
		const result = await getCollectionOptions();

		// Assert
		expect(result).toEqual([]);
	});
});

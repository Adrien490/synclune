import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockGroupBy, mockIsAdmin } = vi.hoisted(() => ({
	mockGroupBy: vi.fn(),
	mockIsAdmin: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		collection: { groupBy: mockGroupBy },
	},
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	CollectionStatus: {
		PUBLIC: "PUBLIC",
		DRAFT: "DRAFT",
		ARCHIVED: "ARCHIVED",
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
	updateTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	COLLECTIONS_CACHE_TAGS: {
		LIST: "collections-list",
		COUNTS: "collection-counts",
		DETAIL: (slug: string) => `collection-${slug}`,
		PRODUCTS: (slug: string) => `collection-${slug}-products`,
	},
}));

import { getCollectionCountsByStatus } from "../get-collection-counts-by-status";

// ============================================================================
// Helpers
// ============================================================================

const EMPTY_COUNTS = {
	PUBLIC: 0,
	DRAFT: 0,
	ARCHIVED: 0,
};

// ============================================================================
// Tests
// ============================================================================

describe("getCollectionCountsByStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(true);
		mockGroupBy.mockResolvedValue([]);
	});

	// ============================================================================
	// Auth
	// ============================================================================

	describe("auth", () => {
		it("throws when user is not admin", async () => {
			mockIsAdmin.mockResolvedValue(false);

			await expect(getCollectionCountsByStatus()).rejects.toThrow(
				"Accès non autorisé. Droits administrateur requis.",
			);
		});

		it("succeeds when user is admin", async () => {
			mockIsAdmin.mockResolvedValue(true);

			await expect(getCollectionCountsByStatus()).resolves.toBeDefined();
		});

		it("does not query DB when not admin", async () => {
			mockIsAdmin.mockResolvedValue(false);

			await expect(getCollectionCountsByStatus()).rejects.toThrow();
			expect(mockGroupBy).not.toHaveBeenCalled();
		});
	});

	// ============================================================================
	// GroupBy mapping
	// ============================================================================

	describe("groupBy mapping", () => {
		it("maps present statuses correctly", async () => {
			mockGroupBy.mockResolvedValue([
				{ status: "PUBLIC", _count: { id: 5 } },
				{ status: "DRAFT", _count: { id: 3 } },
				{ status: "ARCHIVED", _count: { id: 2 } },
			]);

			const result = await getCollectionCountsByStatus();

			expect(result).toEqual({
				PUBLIC: 5,
				DRAFT: 3,
				ARCHIVED: 2,
			});
		});

		it("defaults missing statuses to 0", async () => {
			mockGroupBy.mockResolvedValue([{ status: "PUBLIC", _count: { id: 7 } }]);

			const result = await getCollectionCountsByStatus();

			expect(result).toEqual({
				PUBLIC: 7,
				DRAFT: 0,
				ARCHIVED: 0,
			});
		});

		it("returns all zeros when no collections exist", async () => {
			mockGroupBy.mockResolvedValue([]);

			const result = await getCollectionCountsByStatus();

			expect(result).toEqual(EMPTY_COUNTS);
		});

		it("handles only DRAFT collections", async () => {
			mockGroupBy.mockResolvedValue([{ status: "DRAFT", _count: { id: 12 } }]);

			const result = await getCollectionCountsByStatus();

			expect(result).toEqual({
				PUBLIC: 0,
				DRAFT: 12,
				ARCHIVED: 0,
			});
		});

		it("handles only ARCHIVED collections", async () => {
			mockGroupBy.mockResolvedValue([{ status: "ARCHIVED", _count: { id: 4 } }]);

			const result = await getCollectionCountsByStatus();

			expect(result).toEqual({
				PUBLIC: 0,
				DRAFT: 0,
				ARCHIVED: 4,
			});
		});
	});

	// ============================================================================
	// Cache
	// ============================================================================

	describe("cache", () => {
		it("calls cacheLife and cacheTag", async () => {
			const { cacheLife, cacheTag } = await import("next/cache");

			await getCollectionCountsByStatus();

			expect(cacheLife).toHaveBeenCalledWith("dashboard");
			expect(cacheTag).toHaveBeenCalledWith("collection-counts");
		});
	});

	// ============================================================================
	// Errors
	// ============================================================================

	describe("errors", () => {
		it("returns all zeros on DB error", async () => {
			mockGroupBy.mockRejectedValue(new Error("Connection timeout"));

			const result = await getCollectionCountsByStatus();

			expect(result).toEqual(EMPTY_COUNTS);
		});

		it("calls groupBy with correct parameters", async () => {
			await getCollectionCountsByStatus();

			expect(mockGroupBy).toHaveBeenCalledWith({
				by: ["status"],
				_count: { id: true },
			});
		});
	});
});

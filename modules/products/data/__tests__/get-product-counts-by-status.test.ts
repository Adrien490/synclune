import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGroupBy, mockCacheLife, mockCacheTag, mockIsAdmin } = vi.hoisted(() => ({
	mockGroupBy: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockIsAdmin: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		product: { groupBy: mockGroupBy },
	},
	notDeleted: { deletedAt: null },
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	ProductStatus: {
		PUBLIC: "PUBLIC",
		DRAFT: "DRAFT",
		ARCHIVED: "ARCHIVED",
	},
}));

vi.mock("../constants/cache", () => ({
	PRODUCTS_CACHE_TAGS: {
		COUNTS: "product-counts",
	},
}));

import { getProductCountsByStatus } from "../get-product-counts-by-status";

// ============================================================================
// TESTS
// ============================================================================

describe("getProductCountsByStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockIsAdmin.mockResolvedValue(true);
	});

	// ─── Auth ────────────────────────────────────────────────────────────────

	it("throws when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getProductCountsByStatus()).rejects.toThrow(
			"Accès non autorisé. Droits administrateur requis.",
		);
	});

	it("does not call prisma when not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getProductCountsByStatus()).rejects.toThrow();

		expect(mockGroupBy).not.toHaveBeenCalled();
	});

	// ─── Data fetching ───────────────────────────────────────────────────────

	it("returns counts grouped by status", async () => {
		mockGroupBy.mockResolvedValue([
			{ status: "PUBLIC", _count: { id: 12 } },
			{ status: "DRAFT", _count: { id: 5 } },
			{ status: "ARCHIVED", _count: { id: 3 } },
		]);

		const result = await getProductCountsByStatus();

		expect(result).toEqual({ PUBLIC: 12, DRAFT: 5, ARCHIVED: 3 });
	});

	it("returns zero for statuses not present in DB result", async () => {
		mockGroupBy.mockResolvedValue([{ status: "PUBLIC", _count: { id: 7 } }]);

		const result = await getProductCountsByStatus();

		expect(result).toEqual({ PUBLIC: 7, DRAFT: 0, ARCHIVED: 0 });
	});

	it("returns all zeros when no products exist", async () => {
		mockGroupBy.mockResolvedValue([]);

		const result = await getProductCountsByStatus();

		expect(result).toEqual({ PUBLIC: 0, DRAFT: 0, ARCHIVED: 0 });
	});

	// ─── Error handling ──────────────────────────────────────────────────────

	it("returns all zeros on DB error", async () => {
		mockGroupBy.mockRejectedValue(new Error("DB connection failed"));

		const result = await getProductCountsByStatus();

		expect(result).toEqual({ PUBLIC: 0, DRAFT: 0, ARCHIVED: 0 });
	});

	// ─── Cache ───────────────────────────────────────────────────────────────

	it("calls cacheLife with dashboard profile", async () => {
		mockGroupBy.mockResolvedValue([]);

		await getProductCountsByStatus();

		expect(mockCacheLife).toHaveBeenCalledWith("dashboard");
	});

	it("calls cacheTag with product-counts tag", async () => {
		mockGroupBy.mockResolvedValue([]);

		await getProductCountsByStatus();

		expect(mockCacheTag).toHaveBeenCalledWith("product-counts");
	});

	// ─── Query shape ─────────────────────────────────────────────────────────

	it("queries with notDeleted filter", async () => {
		mockGroupBy.mockResolvedValue([]);

		await getProductCountsByStatus();

		expect(mockGroupBy).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ deletedAt: null }),
			}),
		);
	});

	it("groups by status field", async () => {
		mockGroupBy.mockResolvedValue([]);

		await getProductCountsByStatus();

		expect(mockGroupBy).toHaveBeenCalledWith(
			expect.objectContaining({
				by: ["status"],
			}),
		);
	});
});

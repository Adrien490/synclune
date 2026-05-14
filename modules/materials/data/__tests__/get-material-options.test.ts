import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		material: { findMany: vi.fn() },
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

vi.mock("../../constants/cache", () => ({
	cacheMaterials: () => {
		mockCacheLife("reference");
		mockCacheTag("materials-list");
	},
}));

import { getMaterialOptions } from "../get-material-options";

// ============================================================================
// Factories
// ============================================================================

function makeMaterialOption(overrides: Record<string, unknown> = {}) {
	return {
		id: "material-1",
		name: "Argent",
		slug: "argent",
		_count: { skus: 5 },
		...overrides,
	};
}

// ============================================================================
// Tests
// ============================================================================

describe("getMaterialOptions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.material.findMany.mockResolvedValue([]);
	});

	it("returns active materials ordered by name", async () => {
		const rawMaterials = [
			{ id: "material-1", name: "Argent", slug: "argent", _count: { skuMaterials: 5 } },
			{ id: "material-2", name: "Or", slug: "or", _count: { skuMaterials: 5 } },
		];
		mockPrisma.material.findMany.mockResolvedValue(rawMaterials);

		const result = await getMaterialOptions();

		// The function remaps _count.skuMaterials → _count.skus for public API
		expect(result).toEqual([
			{ id: "material-1", name: "Argent", slug: "argent", _count: { skus: 5 } },
			{ id: "material-2", name: "Or", slug: "or", _count: { skus: 5 } },
		]);
	});

	it("queries only active materials", async () => {
		mockPrisma.material.findMany.mockResolvedValue([]);

		await getMaterialOptions();

		expect(mockPrisma.material.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { isActive: true },
			}),
		);
	});

	it("selects id, name, slug, and active sku count", async () => {
		mockPrisma.material.findMany.mockResolvedValue([]);

		await getMaterialOptions();

		expect(mockPrisma.material.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					name: true,
					slug: true,
					_count: {
						select: {
							skuMaterials: {
								where: { sku: { isActive: true } },
							},
						},
					},
				},
			}),
		);
	});

	it("orders results by name ascending", async () => {
		mockPrisma.material.findMany.mockResolvedValue([]);

		await getMaterialOptions();

		expect(mockPrisma.material.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { name: "asc" },
			}),
		);
	});

	it("calls cacheLife with reference profile", async () => {
		mockPrisma.material.findMany.mockResolvedValue([]);

		await getMaterialOptions();

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("calls cacheTag with the materials list tag", async () => {
		mockPrisma.material.findMany.mockResolvedValue([]);

		await getMaterialOptions();

		expect(mockCacheTag).toHaveBeenCalledWith("materials-list");
	});

	it("returns empty array when no active materials exist", async () => {
		mockPrisma.material.findMany.mockResolvedValue([]);

		const result = await getMaterialOptions();

		expect(result).toEqual([]);
	});

	it("returns empty array on database error", async () => {
		mockPrisma.material.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getMaterialOptions();

		expect(result).toEqual([]);
	});

	it("does not require authentication", async () => {
		mockPrisma.material.findMany.mockResolvedValue([makeMaterialOption()]);

		const result = await getMaterialOptions();

		expect(result).toHaveLength(1);
	});

	it("counts only active skus in the _count field", async () => {
		mockPrisma.material.findMany.mockResolvedValue([]);

		await getMaterialOptions();

		const call = mockPrisma.material.findMany.mock.calls[0]![0];
		expect(call.select._count.select.skuMaterials).toEqual({ where: { sku: { isActive: true } } });
	});
});

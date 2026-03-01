import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		color: { findMany: vi.fn() },
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
	cacheColors: () => {
		mockCacheLife("reference");
		mockCacheTag("colors-list");
	},
}));

import { getColorOptions } from "../get-color-options";

// ============================================================================
// Factories
// ============================================================================

function makeColorOption(overrides: Record<string, unknown> = {}) {
	return {
		id: "color-1",
		name: "Rouge",
		hex: "#FF0000",
		...overrides,
	};
}

// ============================================================================
// Tests
// ============================================================================

describe("getColorOptions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPrisma.color.findMany.mockResolvedValue([]);
	});

	it("returns active colors ordered by name", async () => {
		const colors = [
			makeColorOption({ id: "color-1", name: "Bleu", hex: "#0000FF" }),
			makeColorOption({ id: "color-2", name: "Rouge", hex: "#FF0000" }),
		];
		mockPrisma.color.findMany.mockResolvedValue(colors);

		const result = await getColorOptions();

		expect(result).toEqual(colors);
	});

	it("queries only active colors", async () => {
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColorOptions();

		expect(mockPrisma.color.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { isActive: true },
			}),
		);
	});

	it("selects only id, name, and hex fields", async () => {
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColorOptions();

		expect(mockPrisma.color.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				select: { id: true, name: true, hex: true },
			}),
		);
	});

	it("orders results by name ascending", async () => {
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColorOptions();

		expect(mockPrisma.color.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { name: "asc" },
			}),
		);
	});

	it("calls cacheLife with reference profile", async () => {
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColorOptions();

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("calls cacheTag with the colors list tag", async () => {
		mockPrisma.color.findMany.mockResolvedValue([]);

		await getColorOptions();

		expect(mockCacheTag).toHaveBeenCalledWith("colors-list");
	});

	it("returns empty array when no active colors exist", async () => {
		mockPrisma.color.findMany.mockResolvedValue([]);

		const result = await getColorOptions();

		expect(result).toEqual([]);
	});

	it("returns empty array on database error", async () => {
		mockPrisma.color.findMany.mockRejectedValue(new Error("DB connection failed"));

		const result = await getColorOptions();

		expect(result).toEqual([]);
	});

	it("does not require authentication", async () => {
		mockPrisma.color.findMany.mockResolvedValue([makeColorOption()]);

		const result = await getColorOptions();

		expect(result).toHaveLength(1);
	});
});

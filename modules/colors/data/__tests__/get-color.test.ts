import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockPrisma, mockIsAdmin, mockCacheLife, mockCacheTag } = vi.hoisted(() => ({
	mockPrisma: {
		color: { findFirst: vi.fn() },
	},
	mockIsAdmin: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
}));

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

vi.mock("../../constants/cache", () => ({
	cacheColorDetail: (slug: string) => {
		mockCacheLife("reference");
		mockCacheTag(`color-${slug}`, "colors-list");
	},
}));

vi.mock("../../constants/color.constants", () => ({
	GET_COLOR_SELECT: {
		id: true,
		slug: true,
		name: true,
		hex: true,
		createdAt: true,
		updatedAt: true,
	},
	GET_COLORS_DEFAULT_PER_PAGE: 20,
	GET_COLORS_MAX_RESULTS_PER_PAGE: 200,
	GET_COLORS_DEFAULT_SORT_BY: "name-ascending",
	GET_COLORS_SORT_FIELDS: [
		"name-ascending",
		"name-descending",
		"skuCount-ascending",
		"skuCount-descending",
	],
}));

import { getColorBySlug } from "../get-color";

// ============================================================================
// Factories
// ============================================================================

function makeColor(overrides: Record<string, unknown> = {}) {
	return {
		id: "color-1",
		slug: "rouge",
		name: "Rouge",
		hex: "#FF0000",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		...overrides,
	};
}

// ============================================================================
// Tests: getColorBySlug
// ============================================================================

describe("getColorBySlug", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.color.findFirst.mockResolvedValue(null);
	});

	it("returns null when slug is missing", async () => {
		const result = await getColorBySlug({});

		expect(result).toBeNull();
		expect(mockPrisma.color.findFirst).not.toHaveBeenCalled();
	});

	it("returns null when slug is empty string", async () => {
		const result = await getColorBySlug({ slug: "" });

		expect(result).toBeNull();
		expect(mockPrisma.color.findFirst).not.toHaveBeenCalled();
	});

	it("returns active color for non-admin user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		const color = makeColor();
		mockPrisma.color.findFirst.mockResolvedValue(color);

		const result = await getColorBySlug({ slug: "rouge" });

		expect(result).toEqual(color);
		expect(mockPrisma.color.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { slug: "rouge", isActive: true },
			}),
		);
	});

	it("filters by isActive=true for non-admin user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.color.findFirst.mockResolvedValue(null);

		await getColorBySlug({ slug: "rouge" });

		expect(mockPrisma.color.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isActive: true }),
			}),
		);
	});

	it("does not filter by isActive for admin with includeInactive=true", async () => {
		mockIsAdmin.mockResolvedValue(true);
		const inactiveColor = makeColor({ isActive: false });
		mockPrisma.color.findFirst.mockResolvedValue(inactiveColor);

		await getColorBySlug({ slug: "rouge", includeInactive: true });

		const call = mockPrisma.color.findFirst.mock.calls[0]![0];
		expect(call.where).not.toHaveProperty("isActive");
	});

	it("still filters by isActive when admin but includeInactive is false", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.color.findFirst.mockResolvedValue(null);

		await getColorBySlug({ slug: "rouge", includeInactive: false });

		expect(mockPrisma.color.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isActive: true }),
			}),
		);
	});

	it("still filters by isActive when admin but includeInactive is not provided", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.color.findFirst.mockResolvedValue(null);

		await getColorBySlug({ slug: "rouge" });

		expect(mockPrisma.color.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isActive: true }),
			}),
		);
	});

	it("queries by the correct slug", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.color.findFirst.mockResolvedValue(null);

		await getColorBySlug({ slug: "bleu-nuit" });

		expect(mockPrisma.color.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ slug: "bleu-nuit" }),
			}),
		);
	});

	it("returns null when color is not found", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.color.findFirst.mockResolvedValue(null);

		const result = await getColorBySlug({ slug: "nonexistent" });

		expect(result).toBeNull();
	});

	it("calls cacheLife with reference profile", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.color.findFirst.mockResolvedValue(makeColor());

		await getColorBySlug({ slug: "rouge" });

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("calls cacheTag with the color detail tag", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.color.findFirst.mockResolvedValue(makeColor());

		await getColorBySlug({ slug: "rouge" });

		expect(mockCacheTag).toHaveBeenCalledWith("color-rouge", "colors-list");
	});

	it("returns null on database error", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.color.findFirst.mockRejectedValue(new Error("DB error"));

		const result = await getColorBySlug({ slug: "rouge" });

		expect(result).toBeNull();
	});

	it("uses GET_COLOR_SELECT for the DB query", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.color.findFirst.mockResolvedValue(makeColor());

		await getColorBySlug({ slug: "rouge" });

		expect(mockPrisma.color.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					slug: true,
					name: true,
					hex: true,
					createdAt: true,
					updatedAt: true,
				},
			}),
		);
	});
});

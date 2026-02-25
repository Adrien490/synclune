import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockPrisma,
	mockIsAdmin,
	mockCacheLife,
	mockCacheTag,
} = vi.hoisted(() => ({
	mockPrisma: {
		material: { findFirst: vi.fn() },
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
	cacheMaterialDetail: (slug: string) => {
		mockCacheLife("reference");
		mockCacheTag(`material-${slug}`, "materials-list");
	},
}));

vi.mock("../../constants/materials.constants", () => ({
	GET_MATERIAL_SELECT: {
		id: true,
		slug: true,
		name: true,
		description: true,
		isActive: true,
		createdAt: true,
		updatedAt: true,
	},
	GET_MATERIALS_DEFAULT_PER_PAGE: 20,
	GET_MATERIALS_MAX_RESULTS_PER_PAGE: 200,
	GET_MATERIALS_DEFAULT_SORT_BY: "name-ascending",
	GET_MATERIALS_SORT_FIELDS: [
		"name-ascending",
		"name-descending",
		"skuCount-ascending",
		"skuCount-descending",
		"createdAt-ascending",
		"createdAt-descending",
	],
}));

import { getMaterialBySlug } from "../get-material";

// ============================================================================
// Factories
// ============================================================================

function makeMaterial(overrides: Record<string, unknown> = {}) {
	return {
		id: "material-1",
		slug: "argent",
		name: "Argent",
		description: "Metal precieux",
		isActive: true,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		...overrides,
	};
}

// ============================================================================
// Tests: getMaterialBySlug
// ============================================================================

describe("getMaterialBySlug", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.material.findFirst.mockResolvedValue(null);
	});

	it("returns null when slug is missing", async () => {
		const result = await getMaterialBySlug({});

		expect(result).toBeNull();
		expect(mockPrisma.material.findFirst).not.toHaveBeenCalled();
	});

	it("returns null when slug is empty string", async () => {
		const result = await getMaterialBySlug({ slug: "" });

		expect(result).toBeNull();
		expect(mockPrisma.material.findFirst).not.toHaveBeenCalled();
	});

	it("returns active material for non-admin user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		const material = makeMaterial();
		mockPrisma.material.findFirst.mockResolvedValue(material);

		const result = await getMaterialBySlug({ slug: "argent" });

		expect(result).toEqual(material);
		expect(mockPrisma.material.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { slug: "argent", isActive: true },
			})
		);
	});

	it("filters by isActive=true for non-admin user", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.material.findFirst.mockResolvedValue(null);

		await getMaterialBySlug({ slug: "argent" });

		expect(mockPrisma.material.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isActive: true }),
			})
		);
	});

	it("does not filter by isActive for admin with includeInactive=true", async () => {
		mockIsAdmin.mockResolvedValue(true);
		const inactiveMaterial = makeMaterial({ isActive: false });
		mockPrisma.material.findFirst.mockResolvedValue(inactiveMaterial);

		await getMaterialBySlug({ slug: "argent", includeInactive: true });

		const call = mockPrisma.material.findFirst.mock.calls[0][0];
		expect(call.where).not.toHaveProperty("isActive");
	});

	it("still filters by isActive when admin but includeInactive is false", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.material.findFirst.mockResolvedValue(null);

		await getMaterialBySlug({ slug: "argent", includeInactive: false });

		expect(mockPrisma.material.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isActive: true }),
			})
		);
	});

	it("still filters by isActive when admin but includeInactive is not provided", async () => {
		mockIsAdmin.mockResolvedValue(true);
		mockPrisma.material.findFirst.mockResolvedValue(null);

		await getMaterialBySlug({ slug: "argent" });

		expect(mockPrisma.material.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ isActive: true }),
			})
		);
	});

	it("queries by the correct slug", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.material.findFirst.mockResolvedValue(null);

		await getMaterialBySlug({ slug: "or-jaune" });

		expect(mockPrisma.material.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ slug: "or-jaune" }),
			})
		);
	});

	it("returns null when material is not found", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.material.findFirst.mockResolvedValue(null);

		const result = await getMaterialBySlug({ slug: "nonexistent" });

		expect(result).toBeNull();
	});

	it("calls cacheLife with reference profile", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.material.findFirst.mockResolvedValue(makeMaterial());

		await getMaterialBySlug({ slug: "argent" });

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("calls cacheTag with the material detail and list tags", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.material.findFirst.mockResolvedValue(makeMaterial());

		await getMaterialBySlug({ slug: "argent" });

		expect(mockCacheTag).toHaveBeenCalledWith("material-argent", "materials-list");
	});

	it("returns null on database error", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.material.findFirst.mockRejectedValue(new Error("DB error"));

		const result = await getMaterialBySlug({ slug: "argent" });

		expect(result).toBeNull();
	});

	it("uses GET_MATERIAL_SELECT for the DB query", async () => {
		mockIsAdmin.mockResolvedValue(false);
		mockPrisma.material.findFirst.mockResolvedValue(makeMaterial());

		await getMaterialBySlug({ slug: "argent" });

		expect(mockPrisma.material.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				select: {
					id: true,
					slug: true,
					name: true,
					description: true,
					isActive: true,
					createdAt: true,
					updatedAt: true,
				},
			})
		);
	});
});

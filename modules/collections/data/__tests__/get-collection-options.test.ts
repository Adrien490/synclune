import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockFindMany, mockCacheLife, mockCacheTag, mockIsAdmin } = vi.hoisted(() => ({
	mockFindMany: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockIsAdmin: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		collection: { findMany: mockFindMany },
	},
}));

vi.mock("@/modules/auth/utils/guards", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("@/app/generated/prisma/client", () => ({
	CollectionStatus: { DRAFT: "DRAFT", PUBLIC: "PUBLIC", ARCHIVED: "ARCHIVED" },
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
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
		mockIsAdmin.mockResolvedValue(true);
		mockFindMany.mockResolvedValue([]);
	});

	it("returns empty array when user is not admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		const result = await getCollectionOptions();

		expect(result).toEqual([]);
		expect(mockFindMany).not.toHaveBeenCalled();
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
			}),
		);
	});

	it("does not include ARCHIVED status in the filter", async () => {
		// Arrange
		mockFindMany.mockResolvedValue([]);

		// Act
		await getCollectionOptions();

		// Assert
		const callArg = mockFindMany.mock.calls[0]![0];
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
			}),
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
			}),
		);
	});

	// Le repli vit désormais dans le WRAPPER, hors du scope `"use cache"` : à
	// l'intérieur, la liste vide d'une panne était mise en cache comme un résultat
	// légitime et le select « Collections » apparaissait vide.
	it("returns empty array on DB error (repli hors du scope caché)", async () => {
		// Arrange
		mockFindMany.mockRejectedValue(new Error("DB unavailable"));

		// Act
		const result = await getCollectionOptions();

		// Assert
		expect(result).toEqual([]);
	});

	// Profil `user` et non `reference` : c'est un picker ADMIN qui liste les DRAFT.
	// Sous `reference` (7 j stale / 24 h revalidate), une collection tout juste créée
	// n'apparaissait pas dans le formulaire produit avant le lendemain — alors que
	// l'autre lecteur admin du module était déjà en `user` (audit cache catalogue
	// 2026-07-31).
	it("cache sous le profil `user` avec le tag LIST", async () => {
		// Arrange
		mockFindMany.mockResolvedValue([]);

		// Act
		await getCollectionOptions();

		// Assert
		expect(mockCacheLife).toHaveBeenCalledWith("user");
		expect(mockCacheTag).toHaveBeenCalledWith("collections-list");
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

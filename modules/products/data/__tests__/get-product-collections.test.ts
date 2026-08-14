import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockProductCollectionFindMany,
	mockCollectionFindMany,
	mockCacheLife,
	mockCacheTag,
	mockIsAdmin,
} = vi.hoisted(() => ({
	mockProductCollectionFindMany: vi.fn(),
	mockCollectionFindMany: vi.fn(),
	mockCacheLife: vi.fn(),
	mockCacheTag: vi.fn(),
	mockIsAdmin: vi.fn(),
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	isAdmin: mockIsAdmin,
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		productCollection: { findMany: mockProductCollectionFindMany },
		collection: { findMany: mockCollectionFindMany },
	},
}));

vi.mock("next/cache", () => ({
	cacheLife: mockCacheLife,
	cacheTag: mockCacheTag,
}));

vi.mock("@/modules/collections/constants/cache", () => ({
	COLLECTIONS_CACHE_TAGS: {
		LIST: "collections-list",
	},
}));

import { getProductCollections, getAllCollections } from "../get-product-collections";

// ⚠️ Vrais cuid2 (24 caractères minuscules) et non `"prod-1"` : `getProductCollections`
// est un endpoint RPC (`"use server"`) qui parse désormais son argument, et `z.cuid2()`
// rejette les identifiants à tirets. Une fixture invalide ferait renvoyer `[]` — donc
// un test vert sur le mauvais chemin.
const PRODUCT_ID = "ekxpqzvlyfvmqbhjwvxkzqct";
const OTHER_PRODUCT_ID = "hqvnzjxlmwtpkbdfrycsuoag";

// ============================================================================
// TESTS
// ============================================================================

describe("getProductCollections", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockIsAdmin.mockResolvedValue(true);
	});

	// Ce fichier porte `"use server"` (obligatoire : le consommateur
	// `manage-collections-dialog` est un composant client qui appelle ces fonctions
	// depuis un useEffect). Ses exports sont donc des endpoints RPC, et n'avaient
	// aucune garde.
	it("returns an empty list without querying when the caller is not an admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getProductCollections(PRODUCT_ID)).resolves.toEqual([]);
		expect(mockProductCollectionFindMany).not.toHaveBeenCalled();
	});

	it("returns mapped collections for a product", async () => {
		mockProductCollectionFindMany.mockResolvedValue([
			{ collection: { id: "col-1", name: "Printemps" } },
			{ collection: { id: "col-2", name: "Été" } },
		]);

		const result = await getProductCollections(PRODUCT_ID);

		expect(result).toEqual([
			{ id: "col-1", name: "Printemps" },
			{ id: "col-2", name: "Été" },
		]);
	});

	it("queries by productId", async () => {
		mockProductCollectionFindMany.mockResolvedValue([]);

		await getProductCollections(OTHER_PRODUCT_ID);

		expect(mockProductCollectionFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { productId: OTHER_PRODUCT_ID },
			}),
		);
	});

	it("returns empty array when product has no collections", async () => {
		mockProductCollectionFindMany.mockResolvedValue([]);

		const result = await getProductCollections(PRODUCT_ID);

		expect(result).toEqual([]);
	});

	it("calls cacheLife with reference profile", async () => {
		mockProductCollectionFindMany.mockResolvedValue([]);

		await getProductCollections(PRODUCT_ID);

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("calls cacheTag with product-scoped + collections-list tags", async () => {
		mockProductCollectionFindMany.mockResolvedValue([]);

		await getProductCollections(PRODUCT_ID);

		expect(mockCacheTag).toHaveBeenCalledWith(
			`product-${PRODUCT_ID}-collections`,
			"collections-list",
		);
	});
});

describe("getAllCollections", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockIsAdmin.mockResolvedValue(true);
	});

	// Le cas le plus sensible des deux : ce `findMany` ne filtre PAS le statut, donc
	// l'endpoint rendait les noms des collections DRAFT et ARCHIVED sans aucune garde.
	it("returns an empty list without querying when the caller is not an admin", async () => {
		mockIsAdmin.mockResolvedValue(false);

		await expect(getAllCollections()).resolves.toEqual([]);
		expect(mockCollectionFindMany).not.toHaveBeenCalled();
	});

	// Le statut reste volontairement non filtré : le formulaire admin doit pouvoir
	// rattacher un produit à une collection encore en DRAFT.
	it("does not filter by status for admins (DRAFT collections stay attachable)", async () => {
		mockCollectionFindMany.mockResolvedValue([]);

		await getAllCollections();

		expect(mockCollectionFindMany).toHaveBeenCalledWith(
			expect.not.objectContaining({ where: expect.anything() }),
		);
	});

	it("returns all collections sorted by name", async () => {
		const collections = [
			{ id: "col-1", name: "Automne" },
			{ id: "col-2", name: "Été" },
			{ id: "col-3", name: "Printemps" },
		];
		mockCollectionFindMany.mockResolvedValue(collections);

		const result = await getAllCollections();

		expect(result).toEqual(collections);
	});

	it("queries with orderBy name asc", async () => {
		mockCollectionFindMany.mockResolvedValue([]);

		await getAllCollections();

		expect(mockCollectionFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				orderBy: { name: "asc" },
			}),
		);
	});

	it("returns empty array when no collections exist", async () => {
		mockCollectionFindMany.mockResolvedValue([]);

		const result = await getAllCollections();

		expect(result).toEqual([]);
	});

	it("calls cacheLife with collections profile", async () => {
		mockCollectionFindMany.mockResolvedValue([]);

		await getAllCollections();

		expect(mockCacheLife).toHaveBeenCalledWith("reference");
	});

	it("calls cacheTag with collections-list tag", async () => {
		mockCollectionFindMany.mockResolvedValue([]);

		await getAllCollections();

		expect(mockCacheTag).toHaveBeenCalledWith("collections-list");
	});
});

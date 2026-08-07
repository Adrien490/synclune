import { beforeEach, describe, expect, it, vi } from "vitest";
import { getNavbarMenuData } from "./get-navbar-menu-data";

const mockGetCollections = vi.hoisted(() => vi.fn());
const mockGetProductTypes = vi.hoisted(() => vi.fn());

vi.mock("@/modules/collections/data/get-collections", () => ({
	getCollections: mockGetCollections,
}));
vi.mock("@/modules/product-types/data/get-product-types-for-menu", () => ({
	getProductTypesForMenu: mockGetProductTypes,
}));

describe("getNavbarMenuData (repli par requête, jamais mis en cache)", () => {
	const collectionsValue = { collections: [{ slug: "ete" }], totalCount: 1 };
	const productTypesValue = { productTypes: [{ slug: "bagues" }], totalCount: 1 };

	beforeEach(() => {
		vi.clearAllMocks();
		mockGetCollections.mockResolvedValue(collectionsValue);
		mockGetProductTypes.mockResolvedValue(productTypesValue);
	});

	it("retourne les deux sources quand tout va bien", async () => {
		const result = await getNavbarMenuData();
		expect(result.collectionsData).toBe(collectionsValue);
		expect(result.productTypesData).toBe(productTypesValue);
	});

	it("replie sur un menu vide SANS throw quand une source rejette", async () => {
		// `getProductTypes` rethrow ses erreurs (contrairement à `getCollections`,
		// qui replie dans son wrapper) : c'est le chemin qui doit être absorbé ici,
		// par requête — la fonction n'a plus de scope "use cache" qui figerait ce
		// repli 24 h (CACHE-DEGRADED-VALUE-001, audit navbar 2026-08-03).
		mockGetProductTypes.mockRejectedValue(new Error("db down"));
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		const result = await getNavbarMenuData();

		expect(result.collectionsData).toBe(collectionsValue);
		expect(result.productTypesData).toEqual({ productTypes: [], totalCount: 0 });
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});

	it("l'échec des deux sources rend un menu entièrement vide, sans throw", async () => {
		mockGetCollections.mockRejectedValue(new Error("db down"));
		mockGetProductTypes.mockRejectedValue(new Error("db down"));
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		const result = await getNavbarMenuData();

		expect(result.collectionsData).toEqual({ collections: [], totalCount: 0 });
		expect(result.productTypesData).toEqual({ productTypes: [], totalCount: 0 });
		consoleError.mockRestore();
	});
});

// Plus de suite `extractCollectionImages` ici : l'homonyme local a été supprimé
// (harmonisation 2026-08-06) au profit de la SSOT
// `modules/collections/utils/collection-images.utils.ts`, couverte par ses
// propres tests. La borne « 4 images max » appartient désormais au `take` du
// select `GET_COLLECTIONS_SELECT` (commentaire sur place).

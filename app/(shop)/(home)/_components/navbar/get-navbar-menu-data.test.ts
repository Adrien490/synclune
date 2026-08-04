import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractCollectionImages, getNavbarMenuData } from "./get-navbar-menu-data";

const mockGetCollections = vi.hoisted(() => vi.fn());
const mockGetProductTypes = vi.hoisted(() => vi.fn());

vi.mock("@/modules/collections/data/get-collections", () => ({
	getCollections: mockGetCollections,
}));
vi.mock("@/modules/product-types/data/get-product-types", () => ({
	getProductTypes: mockGetProductTypes,
}));

// Minimal mock matching Collection["products"] shape from GET_COLLECTIONS_SELECT
function makeProduct(imageData?: {
	url: string;
	altText: string | null;
	blurDataUrl: string | null;
}) {
	return {
		isFeatured: false,
		product: imageData
			? {
					id: "prod-1",
					title: "Product",
					skus: [
						{
							priceInclTax: 29.99,
							images: [imageData],
						},
					],
				}
			: {
					id: "prod-1",
					title: "Product",
					skus: [],
				},
	};
}

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

describe("extractCollectionImages", () => {
	it("returns empty array for empty products", () => {
		const result = extractCollectionImages([]);
		expect(result).toEqual([]);
	});

	it("extracts image data from products with images", () => {
		const products = [
			makeProduct({ url: "https://img.com/1.jpg", altText: "Ring", blurDataUrl: "data:blur1" }),
			makeProduct({ url: "https://img.com/2.jpg", altText: "Bracelet", blurDataUrl: null }),
		];

		const result = extractCollectionImages(products as never);
		expect(result).toEqual([
			{ url: "https://img.com/1.jpg", alt: "Ring", blurDataUrl: "data:blur1" },
			{ url: "https://img.com/2.jpg", alt: "Bracelet", blurDataUrl: null },
		]);
	});

	it("filters out products without images (empty skus)", () => {
		const products = [
			makeProduct({ url: "https://img.com/1.jpg", altText: "Ring", blurDataUrl: null }),
			makeProduct(), // no image
			makeProduct({ url: "https://img.com/3.jpg", altText: null, blurDataUrl: null }),
		];

		const result = extractCollectionImages(products as never);
		expect(result).toHaveLength(2);
		expect(result[0]?.url).toBe("https://img.com/1.jpg");
		expect(result[1]?.url).toBe("https://img.com/3.jpg");
	});

	it("limits to 4 images maximum", () => {
		const products = Array.from({ length: 6 }, (_, i) =>
			makeProduct({ url: `https://img.com/${i}.jpg`, altText: `Image ${i}`, blurDataUrl: null }),
		);

		const result = extractCollectionImages(products as never);
		expect(result).toHaveLength(4);
		expect(result[3]?.url).toBe("https://img.com/3.jpg");
	});

	it("preserves null alt text and blur data", () => {
		const products = [
			makeProduct({ url: "https://img.com/1.jpg", altText: null, blurDataUrl: null }),
		];

		const result = extractCollectionImages(products as never);
		expect(result[0]).toEqual({
			url: "https://img.com/1.jpg",
			alt: null,
			blurDataUrl: null,
		});
	});
});

import { describe, it, expect } from "vitest";
import { generateCollectionStructuredData } from "../generate-structured-data";

describe("generateCollectionStructuredData", () => {
	const baseCollection = {
		slug: "ete-2026",
		name: "Été 2026",
		description: "Bijoux estivaux",
		featuredImageUrl: "https://cdn/featured.jpg",
	};

	it("returns @graph with CollectionPage + BreadcrumbList", () => {
		const data = generateCollectionStructuredData(baseCollection);
		expect(data["@context"]).toBe("https://schema.org");
		expect(Array.isArray(data["@graph"])).toBe(true);
		expect(data["@graph"]).toHaveLength(2);
		const types = data["@graph"].map((node) => (node as { "@type": string })["@type"]);
		expect(types).toContain("CollectionPage");
		expect(types).toContain("BreadcrumbList");
	});

	it("omits mainEntity when no products provided", () => {
		const data = generateCollectionStructuredData(baseCollection);
		const collectionPage = data["@graph"][0] as Record<string, unknown>;
		expect(collectionPage.mainEntity).toBeUndefined();
	});

	it("includes mainEntity ItemList with Product+Offer when products provided", () => {
		const data = generateCollectionStructuredData({
			...baseCollection,
			products: [
				{
					slug: "bague-soleil",
					title: "Bague Soleil",
					priceInclTax: 4500, // 45.00 EUR
					imageUrl: "https://cdn/bague.jpg",
					imageAlt: "Bague Soleil dorée",
					inStock: true,
				},
				{
					slug: "collier-lune",
					title: "Collier Lune",
					priceInclTax: 7800,
					inStock: false,
				},
			],
		});
		const collectionPage = data["@graph"][0] as Record<string, unknown>;
		const mainEntity = collectionPage.mainEntity as {
			"@type": string;
			numberOfItems: number;
			itemListElement: Array<{
				"@type": string;
				position: number;
				item: {
					"@type": string;
					name: string;
					url: string;
					image?: { "@type": string; url: string; caption?: string };
					offers?: {
						"@type": string;
						priceCurrency: string;
						price: string;
						availability: string;
						url: string;
					};
				};
			}>;
		};
		expect(mainEntity["@type"]).toBe("ItemList");
		expect(mainEntity.numberOfItems).toBe(2);

		const first = mainEntity.itemListElement[0]!;
		expect(first["@type"]).toBe("ListItem");
		expect(first.position).toBe(1);
		expect(first.item["@type"]).toBe("Product");
		expect(first.item.name).toBe("Bague Soleil");
		expect(first.item.url).toMatch(/\/creations\/bague-soleil$/);
		expect(first.item.image).toEqual({
			"@type": "ImageObject",
			url: "https://cdn/bague.jpg",
			caption: "Bague Soleil dorée",
		});
		expect(first.item.offers).toEqual({
			"@type": "Offer",
			priceCurrency: "EUR",
			price: "45.00",
			availability: "https://schema.org/InStock",
			url: expect.stringMatching(/\/creations\/bague-soleil$/),
		});

		const second = mainEntity.itemListElement[1]!;
		expect(second.item.offers?.availability).toBe("https://schema.org/OutOfStock");
		expect(second.item.image).toBeUndefined();
	});

	it("BreadcrumbList includes Accueil → Collections → [name]", () => {
		const data = generateCollectionStructuredData(baseCollection);
		const breadcrumb = data["@graph"][1] as {
			itemListElement: Array<{ position: number; name: string; item: string }>;
		};
		expect(breadcrumb.itemListElement).toHaveLength(3);
		expect(breadcrumb.itemListElement[2]!.name).toBe("Été 2026");
	});

	it("falls back to default description when collection.description is null", () => {
		const data = generateCollectionStructuredData({
			...baseCollection,
			description: null,
		});
		const collectionPage = data["@graph"][0] as { description: string };
		expect(collectionPage.description).toContain("Été 2026");
	});
});

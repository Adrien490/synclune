import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StructuredData } from "../structured-data";
import type { Product } from "@/modules/products/types/product.types";

/**
 * Le JSON-LD de l'accueil. Deux choses s'y vérifient et nulle part ailleurs :
 * la présence de l'`ItemList` de l'étal (perdue au vidage de la landing du
 * 2026-08-03, remise le 2026-08-04), et le fait que son champ `image` passe par
 * `pickPrimaryImage()` — la SSOT du choix de vignette.
 */

function readGraph(container: HTMLElement): Record<string, unknown>[] {
	const script = container.querySelector('script[type="application/ld+json"]');
	expect(script).not.toBeNull();
	const parsed = JSON.parse(script!.textContent) as {
		"@graph": Record<string, unknown>[];
	};
	return parsed["@graph"];
}

function findNode(container: HTMLElement, type: string) {
	return readGraph(container).find((node) => node["@type"] === type);
}

function createProduct(images: unknown[]): Product {
	return {
		id: "p-1",
		slug: "bague-lune",
		title: "Bague Lune",
		description: "Une bague peinte à la main.",
		skus: [{ priceInclTax: 3490, inventory: 3, images }],
	} as unknown as Product;
}

function image(overrides: Record<string, unknown>) {
	return { url: "https://cdn.test/img.jpg", isPrimary: false, mediaType: "IMAGE", ...overrides };
}

describe("StructuredData — ItemList de l'accueil", () => {
	it("n'émet aucune ItemList sans produit mis en avant", () => {
		const { container } = render(<StructuredData includeHomepageSchemas />);

		expect(findNode(container, "ItemList")).toBeUndefined();
		// La BreadcrumbList, elle, reste inconditionnelle.
		expect(findNode(container, "BreadcrumbList")).toBeDefined();
	});

	it("émet un Product + Offer par création affichée", () => {
		const { container } = render(
			<StructuredData
				includeHomepageSchemas
				featuredProducts={[createProduct([image({ isPrimary: true })])]}
			/>,
		);

		const itemList = findNode(container, "ItemList") as Record<string, unknown>;
		expect(itemList.numberOfItems).toBe(1);

		const [first] = itemList.itemListElement as Record<string, unknown>[];
		const product = first!.item as Record<string, unknown>;
		expect(product["@type"]).toBe("Product");
		expect(product.name).toBe("Bague Lune");
		expect(product.image).toBe("https://cdn.test/img.jpg");

		const offer = product.offers as Record<string, unknown>;
		expect(offer.price).toBe("34.90");
		expect(offer.priceCurrency).toBe("EUR");
		expect(offer.availability).toContain("InStock");
	});

	it("OMET `image` quand le média principal est une vidéo", () => {
		// C'est le défaut que `pickPrimaryImage()` existe pour empêcher : la
		// version d'avant le vidage écrivait `find(isPrimary) ?? images[0]`, ce
		// qui mettait un `.mp4` dans le champ `image` d'un nœud Product —
		// invalide en schema.org.
		const { container } = render(
			<StructuredData
				includeHomepageSchemas
				featuredProducts={[
					createProduct([
						image({ url: "https://cdn.test/clip.mp4", isPrimary: true, mediaType: "VIDEO" }),
					]),
				]}
			/>,
		);

		const itemList = findNode(container, "ItemList") as Record<string, unknown>;
		const [first] = itemList.itemListElement as Record<string, unknown>[];
		const product = first!.item as Record<string, unknown>;

		expect(product).not.toHaveProperty("image");
	});

	it("préfère la première IMAGE quand le média primaire est une vidéo", () => {
		const { container } = render(
			<StructuredData
				includeHomepageSchemas
				featuredProducts={[
					createProduct([
						image({ url: "https://cdn.test/clip.mp4", isPrimary: true, mediaType: "VIDEO" }),
						image({ url: "https://cdn.test/photo.jpg" }),
					]),
				]}
			/>,
		);

		const itemList = findNode(container, "ItemList") as Record<string, unknown>;
		const [first] = itemList.itemListElement as Record<string, unknown>[];
		const product = first!.item as Record<string, unknown>;

		expect(product.image).toBe("https://cdn.test/photo.jpg");
	});
});

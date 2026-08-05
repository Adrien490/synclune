import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/products/services/product-display.service", () => ({
	getPrimaryImageForList: () => ({
		url: "https://example.com/fallback.jpg",
		alt: "Photo produit",
		blurDataUrl: null,
	}),
}));

import {
	buildPieceLabel,
	describeStock,
	getDistinguishingDimensions,
	getQuantityInCart,
	getSkuImage,
	pickInitialSku,
} from "../sku-selector-utils";
import { makeColorLink, makeMaterialLink, makeProduct, makeSku } from "./sku-selector-fixtures";

describe("getDistinguishingDimensions", () => {
	it("ne retient que les dimensions qui varient d'une pièce à l'autre", () => {
		const skus = makeProduct().skus;
		expect(getDistinguishingDimensions(skus)).toEqual({ color: true, material: false });
	});

	it("détecte un matériau qui varie à couleur constante", () => {
		const skus = [
			makeSku({
				id: "a",
				colors: [makeColorLink("lavande", "Lavande")],
				materials: [makeMaterialLink("Perles naturelles")],
			}),
			makeSku({
				id: "b",
				colors: [makeColorLink("lavande", "Lavande")],
				materials: [makeMaterialLink("Laiton")],
			}),
		];
		expect(getDistinguishingDimensions(skus)).toEqual({ color: false, material: true });
	});
});

describe("buildPieceLabel", () => {
	const dimensions = { color: true, material: false };

	it("écrit la taille dès que le SKU en a une, même si elle ne varie pas", () => {
		// C'est ce qui met le P0 hors d'état de nuire : aucune constante ne décide
		// plus si la taille s'affiche.
		const sku = makeSku({ id: "a", colors: [makeColorLink("cristal", "Cristal")], size: "52" });
		expect(buildPieceLabel(sku, { color: false, material: false }, 0)).toEqual({
			text: "Cristal",
			size: "taille 52",
		});
	});

	it("compose couleur et matériau quand les deux distinguent", () => {
		const sku = makeSku({
			id: "a",
			colors: [makeColorLink("lavande", "Lavande")],
			materials: [makeMaterialLink("Perles naturelles")],
		});
		expect(buildPieceLabel(sku, { color: true, material: true }, 0).text).toBe(
			"Lavande · Perles naturelles",
		);
	});

	it("joint les couleurs multiples d'un SKU bicolore", () => {
		const sku = makeSku({
			id: "a",
			colors: [makeColorLink("cristal", "Cristal"), makeColorLink("or-rose", "Or rose")],
		});
		expect(buildPieceLabel(sku, dimensions, 0).text).toBe("Cristal / Or rose");
	});

	it("ne laisse jamais une ligne muette", () => {
		const sku = makeSku({ id: "a" });
		expect(buildPieceLabel(sku, { color: false, material: false }, 2)).toEqual({
			text: "Pièce 3",
			size: null,
		});
	});

	it("laisse la taille parler seule quand rien d'autre ne distingue", () => {
		const sku = makeSku({ id: "a", size: "54" });
		expect(buildPieceLabel(sku, { color: false, material: false }, 0)).toEqual({
			text: "",
			size: "taille 54",
		});
	});
});

describe("describeStock", () => {
	it("annonce le stock restant à AJOUTER, panier déduit", () => {
		const sku = makeSku({ id: "a", inventory: 12 });
		expect(describeStock(sku, 2)).toEqual({
			tone: "available",
			label: "10 disponibles · 2 au panier",
			isBlocked: false,
		});
	});

	it("accorde le singulier", () => {
		expect(describeStock(makeSku({ id: "a", inventory: 8 }), 7).label).toBe(
			"1 disponible · 7 au panier",
		);
	});

	it("bascule en ton d'alerte sous le seuil bas", () => {
		const stock = describeStock(makeSku({ id: "a", inventory: 2 }), 0);
		expect(stock).toEqual({ tone: "low", label: "il n'en reste que 2", isBlocked: false });
	});

	it("compte l'AJOUTABLE dans le libellé bas, pas l'inventaire — panier déduit", () => {
		// À panier vide les deux bases coïncident et le test précédent ne peut pas
		// les départager. Avec 2 au panier sur 3 en stock, une seule est ajoutable :
		// « il n'en reste que 3 · 2 au panier » laissait croire à 3.
		expect(describeStock(makeSku({ id: "a", inventory: 3 }), 2)).toEqual({
			tone: "low",
			label: "il n'en reste que 1 · 2 au panier",
			isBlocked: false,
		});
	});

	it("bloque quand tout le stock est déjà au panier — sans dire « épuisée »", () => {
		// La nuance compte : la pièce existe encore, elle est juste toute réservée.
		expect(describeStock(makeSku({ id: "a", inventory: 3 }), 3)).toEqual({
			tone: "maxed",
			label: "tout est dans ton panier",
			isBlocked: true,
		});
	});

	it("dit « épuisée » à inventaire nul", () => {
		expect(describeStock(makeSku({ id: "a", inventory: 0 }), 0)).toEqual({
			tone: "sold-out",
			label: "épuisée",
			isBlocked: true,
		});
	});
});

describe("getQuantityInCart", () => {
	it("rend 0 pour un SKU absent du panier", () => {
		expect(getQuantityInCart("sku-x", [{ skuId: "sku-y", quantity: 3 }])).toBe(0);
	});

	it("rend la quantité de la ligne correspondante", () => {
		expect(getQuantityInCart("sku-y", [{ skuId: "sku-y", quantity: 3 }])).toBe(3);
	});
});

describe("pickInitialSku", () => {
	const skus = makeProduct().skus;

	it("met en avant la première pièce réellement ajoutable", () => {
		expect(pickInitialSku(skus, [])?.id).toBe("sku-cristal-52");
	});

	it("honore la couleur pré-choisie depuis la carte", () => {
		expect(pickInitialSku(skus, [], "emeraude")?.id).toBe("sku-emeraude-54");
	});

	it("ignore une couleur pré-choisie qui n'est plus ajoutable", () => {
		expect(pickInitialSku(skus, [{ skuId: "sku-emeraude-54", quantity: 2 }], "emeraude")?.id).toBe(
			"sku-cristal-52",
		);
	});

	it("saute une pièce dont tout le stock est déjà au panier", () => {
		expect(pickInitialSku(skus, [{ skuId: "sku-cristal-52", quantity: 12 }])?.id).toBe(
			"sku-cristal-54",
		);
	});

	it("retombe sur une pièce en rupture plutôt que sur rien", () => {
		const soldOut = [makeSku({ id: "a", inventory: 0 }), makeSku({ id: "b", inventory: 0 })];
		expect(pickInitialSku(soldOut, [])?.id).toBe("a");
	});

	it("rend undefined sans aucune pièce", () => {
		expect(pickInitialSku([], [])).toBeUndefined();
	});
});

describe("getSkuImage", () => {
	const product = makeProduct();

	it("préfère le média de la pièce", () => {
		const sku = makeSku({
			id: "a",
			images: [
				{ url: "https://example.com/cristal.jpg", altText: "Cristal", blurDataUrl: "data:x" },
			] as never,
		});
		expect(getSkuImage(sku, product)).toEqual({
			url: "https://example.com/cristal.jpg",
			blurDataUrl: "data:x",
		});
	});

	it("retombe sur la photo du produit quand la pièce n'en a pas", () => {
		// Cas réel : le média primaire du SKU est une VIDÉO, donc le select l'a filtré.
		expect(getSkuImage(makeSku({ id: "a" }), product).url).toBe("https://example.com/fallback.jpg");
	});
});

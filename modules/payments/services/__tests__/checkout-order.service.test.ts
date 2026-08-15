import { describe, expect, it } from "vitest";
import {
	buildOrderLines,
	buildStripeLineItems,
	buildVariantSnapshot,
	computeOrderAmounts,
	effectiveUnitPriceCents,
	type CheckoutCartItem,
} from "../checkout-order.service";

function makeItem(overrides?: {
	quantity?: number;
	variantPriceCents?: number | null;
	size?: string | null;
	colorName?: string | null;
	materialName?: string | null;
	mediaUrl?: string | null;
}): CheckoutCartItem {
	return {
		quantity: overrides?.quantity ?? 1,
		variant: {
			id: "variant-1",
			size: overrides?.size ?? null,
			priceCents: overrides?.variantPriceCents ?? null,
			color: overrides?.colorName ? { name: overrides.colorName } : null,
			material: overrides?.materialName ? { name: overrides.materialName } : null,
			product: {
				id: "product-1",
				name: "Collier goutte arc-en-ciel",
				priceCents: 3800,
				media: overrides?.mediaUrl ? [{ url: overrides.mediaUrl }] : [],
			},
		},
	};
}

describe("buildVariantSnapshot", () => {
	it("joint les axes non null par « · », dans l'ordre couleur · taille · matériau", () => {
		expect(
			buildVariantSnapshot({
				size: "18cm",
				color: { name: "Rose bonbon" },
				material: { name: "Acier inoxydable" },
			}),
		).toBe("Rose bonbon · 18cm · Acier inoxydable");
	});

	it("omet les axes null au lieu de laisser des séparateurs vides", () => {
		expect(buildVariantSnapshot({ size: null, color: { name: "Menthe" }, material: null })).toBe(
			"Menthe",
		);
		expect(buildVariantSnapshot({ size: "52", color: null, material: { name: "Résine" } })).toBe(
			"52 · Résine",
		);
	});

	it("rend null pour une variante sans aucun axe (produit à variante unique)", () => {
		expect(buildVariantSnapshot({ size: null, color: null, material: null })).toBeNull();
	});
});

describe("effectiveUnitPriceCents", () => {
	it("préfère l'override de la variante", () => {
		expect(effectiveUnitPriceCents(makeItem({ variantPriceCents: 4200 }))).toBe(4200);
	});

	it("retombe sur le prix produit quand l'override est null", () => {
		expect(effectiveUnitPriceCents(makeItem({ variantPriceCents: null }))).toBe(3800);
	});
});

describe("buildOrderLines", () => {
	it("fige nom, snapshot de variante, prix effectif et image", () => {
		const lines = buildOrderLines([
			makeItem({
				quantity: 2,
				variantPriceCents: 4200,
				colorName: "Bleu nuit",
				size: "52",
				mediaUrl: "https://example.com/photo.jpg",
			}),
		]);

		expect(lines).toEqual([
			{
				variantId: "variant-1",
				productId: "product-1",
				nameSnapshot: "Collier goutte arc-en-ciel",
				variantSnapshot: "Bleu nuit · 52",
				unitPriceCents: 4200,
				quantity: 2,
				imageUrl: "https://example.com/photo.jpg",
			},
		]);
	});

	it("rend imageUrl null quand le produit n'a aucune IMAGE", () => {
		expect(buildOrderLines([makeItem()])[0]?.imageUrl).toBeNull();
	});
});

describe("computeOrderAmounts", () => {
	it("additionne les lignes (prix × quantité) et le port", () => {
		expect(
			computeOrderAmounts(
				[
					{ unitPriceCents: 3800, quantity: 2 },
					{ unitPriceCents: 1400, quantity: 1 },
				],
				499,
			),
		).toEqual({
			amountItemsCents: 9000,
			amountShippingCents: 499,
			amountTotalCents: 9499,
		});
	});
});

describe("buildStripeLineItems", () => {
	it("émet des price_data inline en eur, montants en centimes SANS ×100", () => {
		const [lineItem] = buildStripeLineItems(
			buildOrderLines([makeItem({ variantPriceCents: 4200, colorName: "Lavande" })]),
		);

		expect(lineItem).toEqual({
			quantity: 1,
			price_data: {
				currency: "eur",
				unit_amount: 4200,
				product_data: {
					name: "Collier goutte arc-en-ciel",
					description: "Lavande",
				},
			},
		});
	});

	it("n'inclut description/images que quand elles existent", () => {
		const [lineItem] = buildStripeLineItems(buildOrderLines([makeItem()]));
		expect(lineItem?.price_data?.product_data).toEqual({ name: "Collier goutte arc-en-ciel" });
	});
});

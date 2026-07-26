/**
 * @regression CART-DISCOUNT-001
 *
 * Le montant de remise affiché dans le panier doit être re-dérivé des articles
 * COURANTS, jamais lu depuis le snapshot `Cart.discountAmountCache`.
 *
 * Bug d'origine : le snapshot était figé à l'application du code et aucune
 * mutation d'article ne le recalculait → le panier affichait « −40,00 € » sur un
 * sous-total retombé à 20,00 €, ou maintenait la remise après repassage sous
 * `minOrderAmount`. Fausse promesse de prix.
 */
import { describe, expect, it } from "vitest";

import {
	resolveCartDiscount,
	type CartItemForCartDiscount,
} from "../resolve-cart-discount.service";
import type { DiscountValidation } from "@/modules/discounts/types/discount.types";

function makeDiscount(overrides: Partial<DiscountValidation> = {}): DiscountValidation {
	return {
		id: "discount-1",
		code: "SUMMER20",
		type: "PERCENTAGE",
		value: 20,
		minOrderAmount: null,
		maxUsageCount: null,
		maxUsagePerUser: null,
		usageCount: 0,
		isActive: true,
		startsAt: new Date("2020-01-01T00:00:00Z"),
		endsAt: null,
		...overrides,
	} as DiscountValidation;
}

function item(priceInclTax: number, quantity = 1, compareAtPrice: number | null = null) {
	return { quantity, sku: { priceInclTax, compareAtPrice } } satisfies CartItemForCartDiscount;
}

const CLEARED = { appliedDiscountCode: null, discountAmountCache: null };

describe("resolveCartDiscount", () => {
	it("recalcule le montant sur les articles courants (le snapshot est ignoré)", () => {
		// Panier réduit de 200 € à 20 € après suppression d'articles : la remise
		// doit suivre (20 % de 2000 = 400), pas rester à l'ancien 4000.
		const result = resolveCartDiscount("SUMMER20", makeDiscount(), [item(2000)]);

		expect(result).toEqual({ appliedDiscountCode: "SUMMER20", discountAmountCache: 400 });
	});

	it("retire la remise quand le panier repasse sous minOrderAmount", () => {
		const discount = makeDiscount({ minOrderAmount: 5000 });

		expect(resolveCartDiscount("SUMMER20", discount, [item(2000)])).toEqual(CLEARED);
		// Au-dessus du minimum, elle s'applique de nouveau.
		expect(resolveCartDiscount("SUMMER20", discount, [item(6000)])).toEqual({
			appliedDiscountCode: "SUMMER20",
			discountAmountCache: 1200,
		});
	});

	it("retire la remise quand le code est devenu inéligible", () => {
		const cases: Array<Partial<DiscountValidation>> = [
			{ isActive: false },
			{ endsAt: new Date("2020-06-01T00:00:00Z") },
			{ startsAt: new Date("2999-01-01T00:00:00Z") },
			{ maxUsageCount: 5, usageCount: 5 },
		];

		for (const overrides of cases) {
			expect(resolveCartDiscount("SUMMER20", makeDiscount(overrides), [item(6000)])).toEqual(
				CLEARED,
			);
		}
	});

	it("retire la remise quand le code n'existe plus (supprimé côté admin)", () => {
		expect(resolveCartDiscount("SUMMER20", null, [item(6000)])).toEqual(CLEARED);
	});

	it("n'affiche pas « −0,00 € » sur un panier 100 % soldé", () => {
		// excludeSaleItems: true → eligibleSubtotal = 0 → remise 0 → rien à afficher.
		const result = resolveCartDiscount("SUMMER20", makeDiscount(), [item(2000, 1, 3000)]);

		expect(result).toEqual(CLEARED);
	});

	it("n'applique la remise qu'aux articles non soldés", () => {
		// 2000 non soldé + 3000 soldé → 20 % de 2000 = 400.
		const result = resolveCartDiscount("SUMMER20", makeDiscount(), [
			item(2000),
			item(3000, 1, 4000),
		]);

		expect(result).toEqual({ appliedDiscountCode: "SUMMER20", discountAmountCache: 400 });
	});

	it("plafonne un montant fixe au sous-total éligible", () => {
		const discount = makeDiscount({ type: "FIXED_AMOUNT", value: 5000 });

		const result = resolveCartDiscount("SUMMER20", discount, [item(2000)]);

		expect(result).toEqual({ appliedDiscountCode: "SUMMER20", discountAmountCache: 2000 });
	});

	it("ne fait rien sans code appliqué ni sur un panier vide", () => {
		expect(resolveCartDiscount(null, makeDiscount(), [item(6000)])).toEqual(CLEARED);
		expect(resolveCartDiscount("SUMMER20", makeDiscount(), [])).toEqual(CLEARED);
	});

	it("ne vérifie PAS maxUsagePerUser (contrôle autoritaire à la création de commande)", () => {
		// Portée délibérée : éviter 2 count par lecture de panier.
		const discount = makeDiscount({ maxUsagePerUser: 1 });

		const result = resolveCartDiscount("SUMMER20", discount, [item(6000)], "user-1");

		expect(result.appliedDiscountCode).toBe("SUMMER20");
	});
});

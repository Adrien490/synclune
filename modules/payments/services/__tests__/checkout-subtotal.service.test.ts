import { describe, it, expect } from "vitest";

import { computeCartSubtotal } from "../checkout-subtotal.service";

function makeSkuResult(id: string, priceInclTax: number) {
	return { success: true, data: { sku: { id, priceInclTax } } };
}

describe("computeCartSubtotal", () => {
	it("multiplie le prix DB par la quantité", () => {
		expect(
			computeCartSubtotal([{ skuId: "sku_1", quantity: 2 }], [makeSkuResult("sku_1", 2990)]),
		).toBe(5980);
	});

	it("somme plusieurs lignes", () => {
		const subtotal = computeCartSubtotal(
			[
				{ skuId: "sku_1", quantity: 2 },
				{ skuId: "sku_2", quantity: 1 },
			],
			[makeSkuResult("sku_1", 2990), makeSkuResult("sku_2", 4990)],
		);

		expect(subtotal).toBe(2990 * 2 + 4990);
	});

	it("retient le prix DB, jamais un prix fourni par le client", () => {
		// `priceAtAdd` accompagne les lignes envoyées par le client ; il ne doit jamais
		// entrer dans le calcul — l'appelant le compare au prix DB et refuse en cas d'écart.
		// Passé par une variable, comme en production (`v.cartItems`) : un littéral inline
		// déclencherait le contrôle de propriétés excédentaires de TS.
		const clientCartItems = [{ skuId: "sku_1", quantity: 1, priceAtAdd: 1 }];

		expect(computeCartSubtotal(clientCartItems, [makeSkuResult("sku_1", 2990)])).toBe(2990);
	});

	it("ignore une ligne sans SKU résolu (l'écart est rattrapé fail-closed par CHECKOUT-TOTAL-005)", () => {
		const subtotal = computeCartSubtotal(
			[
				{ skuId: "sku_1", quantity: 1 },
				{ skuId: "sku_missing", quantity: 3 },
			],
			[makeSkuResult("sku_1", 2990), { success: false }],
		);

		expect(subtotal).toBe(2990);
	});

	it("retourne 0 pour un panier vide", () => {
		expect(computeCartSubtotal([], [])).toBe(0);
	});

	it("ne dépend pas de l'ORDRE des résultats SKU (résolution par id)", () => {
		const subtotal = computeCartSubtotal(
			[
				{ skuId: "sku_1", quantity: 1 },
				{ skuId: "sku_2", quantity: 1 },
			],
			[makeSkuResult("sku_2", 4990), makeSkuResult("sku_1", 2990)],
		);

		expect(subtotal).toBe(2990 + 4990);
	});
});

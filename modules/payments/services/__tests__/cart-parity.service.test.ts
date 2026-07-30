import { describe, it, expect } from "vitest";
import { cartMatchesServerCart, CART_PARITY_ERROR } from "../cart-parity.service";

function server(...lines: Array<[string, number]>) {
	return lines.map(([id, quantity]) => ({ sku: { id }, quantity }));
}

describe("cartMatchesServerCart", () => {
	it("accepte des lignes identiques", () => {
		expect(cartMatchesServerCart([{ skuId: "sku_1", quantity: 2 }], server(["sku_1", 2]))).toBe(
			true,
		);
	});

	it("ignore l'ordre des lignes", () => {
		expect(
			cartMatchesServerCart(
				[
					{ skuId: "sku_2", quantity: 1 },
					{ skuId: "sku_1", quantity: 3 },
				],
				server(["sku_1", 3], ["sku_2", 1]),
			),
		).toBe(true);
	});

	it("refuse une quantité différente — le cas deux onglets", () => {
		// Onglet A rendu avec quantité 1, onglet B l'a passée à 2. Sans cette garde,
		// `updatePaymentAmount` posait le montant du panier serveur sur le PI tandis que
		// `confirmCheckout` facturait celui de l'onglet A.
		expect(cartMatchesServerCart([{ skuId: "sku_1", quantity: 1 }], server(["sku_1", 2]))).toBe(
			false,
		);
	});

	it("refuse une ligne absente du panier serveur", () => {
		expect(
			cartMatchesServerCart(
				[
					{ skuId: "sku_1", quantity: 1 },
					{ skuId: "sku_ghost", quantity: 1 },
				],
				server(["sku_1", 1]),
			),
		).toBe(false);
	});

	it("refuse une ligne retirée côté client", () => {
		expect(
			cartMatchesServerCart([{ skuId: "sku_1", quantity: 1 }], server(["sku_1", 1], ["sku_2", 1])),
		).toBe(false);
	});

	it("ne compare PAS les prix (re-vérifiés séparément contre la base)", () => {
		// Un prix divergent a son propre message (« les prix ont changé ») ; le confondre
		// avec une divergence de panier enverrait le client actualiser pour rien.
		// Passé par une variable, comme en production (`v.cartItems`) : un littéral inline
		// déclencherait le contrôle de propriétés excédentaires de TS.
		const clientItems = [{ skuId: "sku_1", quantity: 1, priceAtAdd: 999_999 }];

		expect(cartMatchesServerCart(clientItems, server(["sku_1", 1]))).toBe(true);
	});

	it("le message d'erreur dit quoi faire et tutoie", () => {
		expect(CART_PARITY_ERROR).toMatch(/actualise/i);
		expect(CART_PARITY_ERROR).not.toMatch(/\b(vous|votre|vos)\b/i);
	});
});

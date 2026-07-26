import { describe, expect, it } from "vitest";

import {
	CHECKOUT_FIELD_LABELS,
	buildCheckoutFieldErrors,
	getIncompleteSections,
} from "../checkout-fields";

/**
 * `buildCheckoutFieldErrors` alimente l'`ErrorSummary` en tête du formulaire de
 * paiement (`CheckoutFormBody`). Ces cas vivaient auparavant dans
 * `checkout-address-fields.test.tsx` via un rendu complet + un mock du résumé ;
 * la projection ayant été extraite du JSX, on la teste directement.
 */
describe("buildCheckoutFieldErrors", () => {
	it("ne retourne rien quand aucun champ n'est en erreur", () => {
		expect(buildCheckoutFieldErrors({})).toEqual([]);
		expect(
			buildCheckoutFieldErrors({
				email: { errors: [] },
				"shipping.city": { errors: [] },
			}),
		).toEqual([]);
	});

	it("ne garde que les champs porteurs d'au moins une erreur", () => {
		const result = buildCheckoutFieldErrors({
			"shipping.fullName": { errors: [] },
			email: { errors: ["Requis"] },
		});

		expect(result).toHaveLength(1);
		expect(result[0]?.name).toBe("email");
	});

	it("traduit le path en libellé FR", () => {
		const result = buildCheckoutFieldErrors({
			"shipping.fullName": { errors: ["Requis"] },
			"shipping.postalCode": { errors: ["Code postal invalide"] },
		});

		expect(result).toEqual([
			{ name: "shipping.fullName", label: "Nom complet", message: "Requis" },
			{ name: "shipping.postalCode", label: "Code postal", message: "Code postal invalide" },
		]);
	});

	it("retombe sur le path brut pour un champ non mappé (pas de libellé vide)", () => {
		const result = buildCheckoutFieldErrors({
			"shipping.unknownField": { errors: ["Boom"] },
		});

		expect(result[0]).toEqual({
			name: "shipping.unknownField",
			label: "shipping.unknownField",
			message: "Boom",
		});
	});

	it("n'expose que la première erreur de chaque champ", () => {
		const result = buildCheckoutFieldErrors({
			email: { errors: ["Requis", "Format invalide"] },
		});

		expect(result[0]?.message).toBe("Requis");
	});

	it("couvre tous les champs déclarés dans CHECKOUT_FIELD_LABELS", () => {
		const fieldMeta = Object.fromEntries(
			Object.keys(CHECKOUT_FIELD_LABELS).map((name) => [name, { errors: ["Requis"] }]),
		);

		const result = buildCheckoutFieldErrors(fieldMeta);

		expect(result).toHaveLength(Object.keys(CHECKOUT_FIELD_LABELS).length);
		// Aucun fallback sur le path : chaque champ a bien un libellé humain.
		expect(result.every((f) => f.label !== f.name)).toBe(true);
	});
});

describe("getIncompleteSections", () => {
	it("dédoublonne les sections en conservant l'ordre de première apparition", () => {
		expect(
			getIncompleteSections(["shipping.city", "email", "shipping.fullName", "shipping.country"]),
		).toEqual(["Livraison", "Contact"]);
	});

	it("ignore les paths inconnus", () => {
		expect(getIncompleteSections(["nope", "email"])).toEqual(["Contact"]);
	});
});

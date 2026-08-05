import { describe, expect, it } from "vitest";

import { isSoldOut, sortSoldOutLast } from "../product-availability.service";

type TestSku = { isActive: boolean; inventory: number };

/**
 * Les fonctions testées ne lisent que `skus[].isActive` et `skus[].inventory` —
 * le `as never` évite de recopier ici les ~40 champs de `GET_PRODUCTS_SELECT`,
 * qui n'apporteraient rien et dériveraient au premier changement de select.
 */
const make = (id: string, skus: TestSku[]) => ({ id, skus }) as never;

describe("isSoldOut", () => {
	it("compte l'agrégat des SKUs ACTIFS, pas le premier", () => {
		// Même règle que `getProductCardData` : trois couleurs à un exemplaire ne
		// sont pas une rupture. Les deux doivent rester d'accord, sinon le classement
		// pousse en fin une pièce que la carte présente comme achetable.
		expect(
			isSoldOut(
				make("a", [
					{ isActive: true, inventory: 0 },
					{ isActive: true, inventory: 1 },
				]),
			),
		).toBe(false);
	});

	it("ignore le stock des SKUs INACTIFS", () => {
		// Un SKU dépublié n'est pas achetable : son stock ne doit pas faire passer la
		// pièce pour disponible.
		expect(
			isSoldOut(
				make("a", [
					{ isActive: false, inventory: 12 },
					{ isActive: true, inventory: 0 },
				]),
			),
		).toBe(true);
	});

	it("traite « aucun SKU actif » comme épuisé", () => {
		// L'état « à venir » n'offre pas d'achat, et c'est le seul critère ici.
		expect(isSoldOut(make("a", []))).toBe(true);
		expect(isSoldOut(make("a", [{ isActive: false, inventory: 3 }]))).toBe(true);
	});
});

describe("sortSoldOutLast", () => {
	const available = (id: string) => make(id, [{ isActive: true, inventory: 2 }]);
	const soldOut = (id: string) => make(id, [{ isActive: true, inventory: 0 }]);

	it("pousse les épuisées en fin", () => {
		const sorted = sortSoldOutLast([soldOut("a"), available("b"), soldOut("c"), available("d")]);
		expect(sorted.map((p: { id: string }) => p.id)).toEqual(["b", "d", "a", "c"]);
	});

	it("préserve l'ordre relatif dans chaque groupe (tri STABLE)", () => {
		// L'étal lit en `created-descending` : un tri instable brouillerait la
		// nouveauté, qui est tout le sujet de la section.
		const sorted = sortSoldOutLast([
			available("1"),
			soldOut("2"),
			available("3"),
			soldOut("4"),
			available("5"),
		]);
		expect(sorted.map((p: { id: string }) => p.id)).toEqual(["1", "3", "5", "2", "4"]);
	});

	it("rend AUTANT de pièces qu'il en reçoit, même tout épuisé", () => {
		// C'est la raison de réordonner au lieu de filtrer : le compte de cellules de
		// l'étal (5 + le carton) fait tomber juste les rangées aux trois largeurs. Une
		// boutique entièrement épuisée doit continuer de rendre cinq pièces.
		const all = [soldOut("a"), soldOut("b"), soldOut("c"), soldOut("d"), soldOut("e")];
		expect(sortSoldOutLast(all)).toHaveLength(5);
		expect(sortSoldOutLast(all).map((p: { id: string }) => p.id)).toEqual([
			"a",
			"b",
			"c",
			"d",
			"e",
		]);
	});

	it("ne mute pas le tableau reçu", () => {
		const input = [soldOut("a"), available("b")];
		sortSoldOutLast(input);
		expect(input.map((p: { id: string }) => p.id)).toEqual(["a", "b"]);
	});
});

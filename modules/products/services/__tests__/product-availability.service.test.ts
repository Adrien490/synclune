import { describe, expect, it } from "vitest";

import { interleaveByType, isSoldOut, orderHeroProducts } from "../product-availability.service";

type TestVariant = { active: boolean; stock: number };

/**
 * Les fonctions testées ne lisent que `variants[].active` et `variants[].stock` —
 * le `as never` évite de recopier ici les ~40 champs de `GET_PRODUCTS_SELECT`,
 * qui n'apporteraient rien et dériveraient au premier changement de select.
 */
const make = (id: string, variants: TestVariant[], typeId?: string) =>
	({ id, variants, type: typeId ? { id: typeId } : null }) as never;

describe("isSoldOut", () => {
	it("compte l'agrégat des VARIANTs ACTIFS, pas le premier", () => {
		// Même règle que `getProductCardData` : trois couleurs à un exemplaire ne
		// sont pas une rupture. Les deux doivent rester d'accord, sinon le classement
		// pousse en fin une pièce que la carte présente comme achetable.
		expect(
			isSoldOut(
				make("a", [
					{ active: true, stock: 0 },
					{ active: true, stock: 1 },
				]),
			),
		).toBe(false);
	});

	it("ignore le stock des VARIANTs INACTIFS", () => {
		// Un VARIANT dépublié n'est pas achetable : son stock ne doit pas faire passer la
		// pièce pour disponible.
		expect(
			isSoldOut(
				make("a", [
					{ active: false, stock: 12 },
					{ active: true, stock: 0 },
				]),
			),
		).toBe(true);
	});

	it("traite « aucun VARIANT actif » comme épuisé", () => {
		// L'état « à venir » n'offre pas d'achat, et c'est le seul critère ici.
		expect(isSoldOut(make("a", []))).toBe(true);
		expect(isSoldOut(make("a", [{ active: false, stock: 3 }]))).toBe(true);
	});
});

describe("orderHeroProducts — critère 1 : disponibilité", () => {
	const available = (id: string) => make(id, [{ active: true, stock: 2 }]);
	const soldOut = (id: string) => make(id, [{ active: true, stock: 0 }]);

	it("pousse les épuisées en fin", () => {
		const sorted = orderHeroProducts([soldOut("a"), available("b"), soldOut("c"), available("d")]);
		expect(sorted.map((p: { id: string }) => p.id)).toEqual(["b", "d", "a", "c"]);
	});

	it("préserve l'ordre relatif dans chaque groupe (tri STABLE)", () => {
		// L'étal lit en `created-descending` : un tri instable brouillerait la
		// nouveauté, qui est tout le sujet de la section.
		const sorted = orderHeroProducts([
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
		expect(orderHeroProducts(all)).toHaveLength(5);
		expect(orderHeroProducts(all).map((p: { id: string }) => p.id)).toEqual([
			"a",
			"b",
			"c",
			"d",
			"e",
		]);
	});

	it("ne mute pas le tableau reçu", () => {
		const input = [soldOut("a"), available("b")];
		orderHeroProducts(input);
		expect(input.map((p: { id: string }) => p.id)).toEqual(["a", "b"]);
	});
});

describe("interleaveByType — critère 2 : étalement des types", () => {
	const typed = (id: string, typeId: string) => make(id, [{ active: true, stock: 2 }], typeId);
	const ids = (list: { id: string }[]) => list.map((p) => p.id);

	it("sort un type inédit avant un doublon de type déjà vu", () => {
		// Le cas MESURÉ sur le catalogue servi le 2026-08-06 : par récence pure, le
		// premier écran rendait 3 « Papilloux » puis 2 « Chaîne de corps » — aucune
		// bague, aucun bracelet, aucun collier, alors qu'ils font le gros du catalogue.
		const ordered = interleaveByType([
			typed("papilloux-1", "boucles"),
			typed("papilloux-2", "boucles"),
			typed("papilloux-3", "boucles"),
			typed("chaine-1", "chaine"),
			typed("bague-1", "bague"),
		]);

		// Les trois premières cellules couvrent trois types distincts.
		expect(ids(ordered).slice(0, 3)).toEqual(["papilloux-1", "chaine-1", "bague-1"]);
		// Et rien n'est perdu : les doublons suivent.
		expect(ids(ordered)).toHaveLength(5);
		expect(new Set(ids(ordered)).size).toBe(5);
	});

	it("laisse la RÉCENCE décider à couverture égale", () => {
		// La première vague sort dans l'ordre d'apparition des types, qui est celui de
		// la requête (`created-descending`). L'étalement ne doit pas devenir un tri.
		const ordered = interleaveByType([
			typed("a", "bague"),
			typed("b", "collier"),
			typed("c", "bracelet"),
		]);
		expect(ids(ordered)).toEqual(["a", "b", "c"]);
	});

	it("ne fond pas les pièces SANS type dans un même groupe", () => {
		// Sinon toutes les pièces non typées se disputeraient une seule place, et une
		// boutique qui n'a pas encore rempli ce champ verrait sa home s'effondrer à une
		// cellule. Chacune forme son propre groupe.
		const untyped = (id: string) => make(id, [{ active: true, stock: 2 }]);
		const ordered = interleaveByType([untyped("a"), untyped("b"), untyped("c")]);
		expect(ids(ordered)).toEqual(["a", "b", "c"]);
	});

	it("rend TOUJOURS autant de pièces qu'il en reçoit", () => {
		// La fonction réordonne, elle ne tronque pas : c'est l'appelant qui coupe, et
		// c'est ce qui garde le compte de cellules du premier écran constant.
		const mono = ["a", "b", "c", "d", "e", "f"].map((id) => typed(id, "boucles"));
		expect(ids(interleaveByType(mono))).toEqual(["a", "b", "c", "d", "e", "f"]);
	});
});

describe("orderHeroProducts — l'ordre des deux critères", () => {
	const availableTyped = (id: string, typeId: string) =>
		make(id, [{ active: true, stock: 2 }], typeId);
	const soldOutTyped = (id: string, typeId: string) =>
		make(id, [{ active: true, stock: 0 }], typeId);

	it("ne fait JAMAIS remonter une pièce épuisée pour cause de type rare", () => {
		// ⚠️ L'inversion des deux critères est le piège de cette fonction : diversifier
		// avant de partitionner mettrait la bague épuisée (type unique) devant deux
		// boucles achetables — soit exactement le défaut que le critère 1 empêche.
		const ordered = orderHeroProducts([
			soldOutTyped("bague-epuisee", "bague"),
			availableTyped("boucles-1", "boucles"),
			availableTyped("boucles-2", "boucles"),
		]);

		expect(ordered.map((p: { id: string }) => p.id)).toEqual([
			"boucles-1",
			"boucles-2",
			"bague-epuisee",
		]);
	});

	it("étale les types À L'INTÉRIEUR de chaque partition", () => {
		const ordered = orderHeroProducts([
			availableTyped("b1", "boucles"),
			availableTyped("b2", "boucles"),
			availableTyped("c1", "collier"),
			soldOutTyped("s-b1", "boucles"),
			soldOutTyped("s-b2", "boucles"),
			soldOutTyped("s-g1", "bague"),
		]);

		expect(ordered.map((p: { id: string }) => p.id)).toEqual([
			// disponibles, types étalés
			"b1",
			"c1",
			"b2",
			// puis épuisées, types étalés elles aussi
			"s-b1",
			"s-g1",
			"s-b2",
		]);
	});
});

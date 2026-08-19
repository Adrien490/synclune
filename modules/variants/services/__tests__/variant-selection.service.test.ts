import { describe, expect, it } from "vitest";
import {
	getPrimaryVariantForList,
	type GetPrimaryVariantOptions,
} from "../variant-selection.service";

type TestVariant = {
	id: string;
	active: boolean;
	stock: number;
	priceCents: number | null;
	color: { id: string; name: string; hex: string | null } | null;
	material: { id: string; name: string } | null;
};

function variant(overrides: Partial<TestVariant> & { id: string }): TestVariant {
	return { active: true, stock: 1, priceCents: null, color: null, material: null, ...overrides };
}

/** Fige les génériques : l'inférence depuis un littéral retombe sur le type de base. */
function pick(variants: TestVariant[], options?: GetPrimaryVariantOptions): TestVariant | null {
	return getPrimaryVariantForList<TestVariant, { variants: TestVariant[] }>({ variants }, options);
}

describe("getPrimaryVariantForList", () => {
	it("retourne null sans variantes", () => {
		expect(pick([])).toBeNull();
		expect(
			getPrimaryVariantForList<TestVariant, { variants: null }>({ variants: null }),
		).toBeNull();
	});

	it("retourne le représentant (première active) quand il est en stock", () => {
		const variants = [
			variant({ id: "v1", active: false }),
			variant({ id: "v2", stock: 3 }),
			variant({ id: "v3", stock: 5 }),
		];
		expect(pick(variants)?.id).toBe("v2");
	});

	it("bascule sur la variante en stock la moins chère quand le représentant est épuisé", () => {
		const variants = [
			variant({ id: "v1", stock: 0 }),
			variant({ id: "v2", stock: 2, priceCents: 3000 }),
			variant({ id: "v3", stock: 2, priceCents: 2000 }),
		];
		expect(pick(variants)?.id).toBe("v3");
	});

	it("retombe sur le représentant épuisé quand plus rien n'est en stock", () => {
		const variants = [variant({ id: "v1", stock: 0 }), variant({ id: "v2", stock: 0 })];
		expect(pick(variants)?.id).toBe("v1");
	});

	/**
	 * ⚠️ Verrou du défaut slug/nom (audit 2026-08-19). L'option s'appelle
	 * `preferredColorSlug` et transporte l'identité URL de la couleur — son NOM
	 * SLUGIFIÉ (« bleu-nuit »). La comparaison était `color?.name ===
	 * preferredColorSlug`, soit un slug confronté à un nom : « bleu-nuit » ne
	 * pouvait jamais égaler « Bleu nuit », exactement l'erreur que CLAUDE.md
	 * interdit (« ne jamais comparer un slug à `color.name` »). Latente faute
	 * d'appelant, elle se réveillait au premier branchement du filtre couleur
	 * sur les cartes produit.
	 */
	it("matche une couleur préférée par SLUG contre le nom slugifié", () => {
		const variants = [
			variant({ id: "v1", color: { id: "c1", name: "Or rose", hex: "#f4c2c2" }, stock: 2 }),
			variant({ id: "v2", color: { id: "c2", name: "Bleu nuit", hex: "#191970" }, stock: 2 }),
		];

		expect(pick(variants, { preferredColorSlug: "bleu-nuit" })?.id).toBe("v2");
	});

	it("préfère la couleur demandée EN STOCK, puis la même couleur épuisée", () => {
		const variants = [
			variant({ id: "v1", color: { id: "c2", name: "Bleu nuit", hex: null }, stock: 0 }),
			variant({ id: "v2", color: { id: "c2", name: "Bleu nuit", hex: null }, stock: 3 }),
		];

		expect(pick(variants, { preferredColorSlug: "bleu-nuit" })?.id).toBe("v2");

		const allOut = variants.map((v) => ({ ...v, stock: 0 }));
		expect(pick(allOut, { preferredColorSlug: "bleu-nuit" })?.id).toBe("v1");
	});

	it("ignore une couleur préférée inconnue et suit l'ordre normal", () => {
		const variants = [variant({ id: "v1", stock: 2 })];
		expect(pick(variants, { preferredColorSlug: "vert-sapin" })?.id).toBe("v1");
	});
});

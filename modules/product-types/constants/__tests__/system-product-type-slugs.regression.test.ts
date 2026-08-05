/**
 * @regression product-type-slugs-ssot
 *
 * `PRODUCT_TYPES_REQUIRING_SIZE` a valu `["ring", "bracelet"]` — en anglais, au
 * singulier — sous un commentaire « ⚠️ Aligné avec les slugs en base de données ».
 * Les types du seed sont `bagues` / `bracelets` / `colliers` / … : intersection vide,
 * donc `requiresSize` toujours faux, donc **aucun sélecteur de taille rendu**, ni
 * dans le dialog panier ni sur la fiche produit. Le SKU envoyé au panier était le
 * premier du tableau : « Bague Fleur de Cristal » partait toujours en 52.
 *
 * Le test unitaire qui existait était vert pour la mauvaise raison — il assertait
 * `toContain("ring")` contre la constante elle-même, sans jamais rencontrer un slug
 * réel. Ce fichier confronte les consommateurs à la SSOT, et interdit qu'un slug de
 * type soit à nouveau comparé à un littéral.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { PRODUCT_TYPES_REQUIRING_SIZE } from "@/modules/products/constants/product-texts.constants";
import { SYSTEM_PRODUCT_TYPE_SLUGS } from "../system-product-type-slugs";

const ROOT = join(__dirname, "../../../..");

/** Fichiers qui décident d'un comportement à partir du type de produit. */
const SLUG_CONSUMERS = [
	"modules/products/constants/product-texts.constants.ts",
	"modules/skus/components/size-selector.tsx",
	"modules/skus/components/size-guide-dialog.tsx",
	"prisma/seed.ts",
] as const;

/**
 * Slugs anglais que le dépôt a réellement portés. Aucun n'a jamais existé en base ;
 * les revoir en dur, où que ce soit, c'est refaire le bug.
 */
const PHANTOM_SLUGS = ["ring", "rings", "bracelet", "necklace", "necklaces"] as const;

describe("@regression product-type-slugs-ssot", () => {
	it("expose les 7 types système du seed", () => {
		expect(Object.values(SYSTEM_PRODUCT_TYPE_SLUGS)).toEqual([
			"colliers",
			"bracelets",
			"bagues",
			"chaines-corps",
			"papilloux",
			"chaines-cheveux",
			"porte-cles",
		]);
	});

	it("PRODUCT_TYPES_REQUIRING_SIZE ne cite que des slugs de la SSOT", () => {
		const known: readonly string[] = Object.values(SYSTEM_PRODUCT_TYPE_SLUGS);
		for (const slug of PRODUCT_TYPES_REQUIRING_SIZE) {
			expect(known).toContain(slug);
		}
	});

	it.each(SLUG_CONSUMERS)("%s dérive ses slugs de la SSOT", (relPath) => {
		const code = readFileSync(join(ROOT, relPath), "utf8");
		expect(code).toContain("SYSTEM_PRODUCT_TYPE_SLUGS");
	});

	it.each(SLUG_CONSUMERS)("%s ne compare plus un type à un slug fantôme", (relPath) => {
		const code = readFileSync(join(ROOT, relPath), "utf8");
		// On vise la VALEUR entre guillemets, pas le mot : « bracelets » reste un
		// libellé légitime en prose et dans les onglets du guide des tailles.
		for (const phantom of PHANTOM_SLUGS) {
			expect(code).not.toMatch(new RegExp(`(===|includes\\()\\s*"${phantom}"`));
			expect(code).not.toMatch(new RegExp(`slug:\\s*"${phantom}"`));
		}
	});
});

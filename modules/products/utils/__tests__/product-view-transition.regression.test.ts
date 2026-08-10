/**
 * @regression product-view-transition-ssot
 *
 * Le morph carte → PDP repose sur l'ÉGALITÉ de deux `view-transition-name` :
 * celui de la photo de `ProductCard` et celui de la première slide de la
 * galerie PDP. Avant la SSOT `productViewTransitionName()`, chaque fichier
 * écrivait son propre littéral `product-${id}`, alignés par un simple
 * commentaire croisé (`gallery.tsx:436`) — exactement le type d'ancre qui
 * dérive sans bruit : renommer un côté ne casse ni build ni test, le morph
 * cesse juste de se déclencher (la view transition dégénère en cross-fade).
 *
 * Deux assertions :
 * 1. les deux consommateurs importent la SSOT (et l'appellent) ;
 * 2. plus aucun littéral `product-${…}` n'alimente un viewTransitionName
 *    dans ces fichiers.
 *
 * Le format `product-<id>` lui-même est verrouillé par le test unitaire :
 * le changer invalide le morph pour tout HTML déjà servi (bfcache, prerender)
 * — à ne faire qu'en connaissance de cause.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { productViewTransitionName } from "../product-view-transition";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

const CONSUMERS = [
	"modules/products/components/product-card.tsx",
	"modules/media/components/gallery/gallery.tsx",
] as const;

describe("@regression product-view-transition-ssot", () => {
	it("émet le format que les deux surfaces partagent", () => {
		expect(productViewTransitionName("abc-123")).toBe("product-abc-123");
	});

	it.each(CONSUMERS)("%s consomme la SSOT", (relativePath) => {
		const source = readFileSync(join(REPO_ROOT, relativePath), "utf-8");

		expect(
			source,
			"Le fichier doit importer productViewTransitionName depuis " +
				"modules/products/utils/product-view-transition — c'est l'égalité des " +
				"deux noms qui déclenche le morph carte → PDP.",
		).toMatch(/import \{ productViewTransitionName \}/);
		expect(source).toMatch(/productViewTransitionName\(/);
	});

	it.each(CONSUMERS)("%s ne réécrit pas le littéral en ligne", (relativePath) => {
		const source = readFileSync(join(REPO_ROOT, relativePath), "utf-8");

		// Un template `product-${…}` réintroduit la double définition que la
		// SSOT a remplacée — qu'il soit passé à viewTransitionName ou stocké
		// dans une variable intermédiaire.
		expect(source).not.toMatch(/`product-\$\{/);
	});
});

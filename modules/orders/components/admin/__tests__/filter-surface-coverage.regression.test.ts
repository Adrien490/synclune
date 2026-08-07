/**
 * @regression orders-filter-surface-coverage
 *
 * Audit « Admin commandes » 2026-07-26 (P3). Le tiroir de filtres MOBILE n'exposait que
 * 4 des 12 filtres du schéma : ni fourchette de montant, ni période, ni les 3 presets
 * de facturation, ni la corbeille. Un admin sur téléphone ne pouvait pas atteindre les
 * vues d'anomalie (commande encaissée sans facture, PDF non archivé, DLQ escaladée),
 * qui sont précisément des files de travail à traiter.
 *
 * ## Ce test s'appelait `orders-filter-surface-parity` jusqu'au 2026-08-07
 *
 * Il verrouillait alors la parité de DEUX surfaces — `orders-filter-sheet.tsx` (673 l.)
 * et `orders-filter-drawer.tsx` (331 l.) — parce que les commandes étaient la seule
 * liste admin à porter deux implémentations du même filtre. Ce test était le prix de
 * cette duplication : un garde-fou dont le seul travail était d'empêcher deux copies
 * de diverger.
 *
 * Le tiroir a été supprimé (audit d'imbrication 2026-08-07) : les deux surfaces
 * traitaient exactement les mêmes onze `filter_*`, et `FilterSheetWrapper` bascule
 * déjà bottom-sheet ↔ right-sheet selon le viewport — la seconde implémentation
 * n'apportait aucune bascule que la première n'avait pas.
 *
 * ⚠️ **La moitié qui compte survit, et c'est celle-ci** : la surface UNIQUE doit
 * pouvoir RÉGLER tous les filtres du schéma. C'est l'assertion qui a attrapé le bug
 * d'origine ; la parité n'en était que le corollaire à deux surfaces.
 *
 * Volontairement statique (lecture de source) : ce qui doit être couvert, ce sont les
 * clés `filter_*`, pas une UI.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const root = process.cwd();

const SHEET = readFileSync(
	join(root, "modules/orders/components/admin/orders-filter-sheet.tsx"),
	"utf-8",
);
const SCHEMA = readFileSync(join(root, "modules/orders/schemas/order.schemas.ts"), "utf-8");

/** Clés de `orderFiltersSchema`, dérivées du schéma lui-même (pas d'une liste figée). */
function schemaFilterKeys(): string[] {
	const block = SCHEMA.slice(
		SCHEMA.indexOf("export const orderFiltersSchema"),
		SCHEMA.indexOf("// SORT SCHEMA"),
	);
	expect(block.length).toBeGreaterThan(0);

	const keys = [...block.matchAll(/^\t\t(\w+):/gm)].map((m) => m[1]!);
	return [...new Set(keys)];
}

describe("@regression orders-filter-surface-coverage", () => {
	const keys = schemaFilterKeys();

	it("dérive bien les clés du schéma (garde-fou du garde-fou)", () => {
		expect(keys).toContain("status");
		expect(keys).toContain("totalMin");
		expect(keys).toContain("invoiceAnomaly");
		// Plancher abaissé de 12 à 11 au Lot 4 (audit V2) : la clé `fulfillmentStatus`
		// part avec l'axe, et avec elle une section entière du tiroir de filtres qui
		// montrait le même avancement que la section « statut ».
		expect(keys.length).toBeGreaterThanOrEqual(11);
	});

	/**
	 * Un filtre est ATTEIGNABLE si la surface peut l'ÉCRIRE — pas seulement le lire.
	 *
	 * Chercher `filter_x` n'importe où était insuffisant : le composant lit l'URL pour
	 * refléter l'état courant (`searchParams.get("filter_showDeleted")`), donc un filtre
	 * lu mais jamais réglable passait le test. Vérifié en retirant l'option
	 * « Corbeille » : le test restait vert.
	 */
	function isSettable(source: string, key: string): boolean {
		const escaped = `filter_${key}`;
		return (
			// écriture directe dans l'URL
			source.includes(`params.set("${escaped}"`) ||
			source.includes(`params.append("${escaped}"`) ||
			// champ de formulaire (le handler écrit ensuite la clé lue depuis FormData)
			source.includes(`name="${escaped}"`) ||
			// clé énumérée dans une liste de params écrits en boucle
			new RegExp(`RANGE_KEYS[\\s\\S]{0,400}"${escaped}"`).test(source) ||
			// preset déclarant explicitement le param qu'il pose
			new RegExp(`param:\\s*"${escaped}"`).test(source)
		);
	}

	it("la feuille de filtres permet de RÉGLER tous les filtres du schéma", () => {
		const missing = keys.filter((key) => !isSettable(SHEET, key));

		expect(
			missing,
			`Filtres non RÉGLABLES depuis la feuille : ${missing.join(", ")}. ` +
				`C'est désormais la SEULE surface de filtre des commandes (mobile et desktop) : ` +
				`un filtre qu'elle n'expose pas est inatteignable, point.`,
		).toEqual([]);
	});
});

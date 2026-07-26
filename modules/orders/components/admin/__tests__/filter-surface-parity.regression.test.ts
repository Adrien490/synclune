/**
 * @regression orders-filter-surface-parity
 *
 * Audit « Admin commandes » 2026-07-26 (P3). Le tiroir de filtres MOBILE n'exposait que
 * 4 des 12 filtres du schéma : ni fourchette de montant, ni période, ni les 3 presets
 * de facturation, ni la corbeille. Un admin sur téléphone ne pouvait pas atteindre les
 * vues d'anomalie (commande encaissée sans facture, PDF non archivé, DLQ escaladée),
 * qui sont précisément des files de travail à traiter.
 *
 * Ce test verrouille la parité des deux surfaces vis-à-vis de `orderFiltersSchema` :
 * ajouter un filtre au schéma sans le brancher dans les DEUX surfaces échoue ici.
 *
 * Volontairement statique (lecture de sources) : les deux composants ont des modèles
 * d'interaction incompatibles (listbox mono-sélection vs formulaire multi-champs), donc
 * un test de rendu comparatif n'aurait pas de sens — c'est la COUVERTURE des clés
 * `filter_*` qui doit être identique, pas l'UI.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const root = process.cwd();

const SHEET = readFileSync(
	join(root, "modules/orders/components/admin/orders-filter-sheet.tsx"),
	"utf-8",
);
const DRAWER = readFileSync(
	join(root, "modules/orders/components/admin/orders-filter-drawer.tsx"),
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
	// `showDeleted` est exprimé côté UI par un preset, pas par une clé homonyme partout.
	return [...new Set(keys)];
}

describe("@regression orders-filter-surface-parity", () => {
	const keys = schemaFilterKeys();

	it("dérive bien les clés du schéma (garde-fou du garde-fou)", () => {
		expect(keys).toContain("status");
		expect(keys).toContain("totalMin");
		expect(keys).toContain("invoiceAnomaly");
		expect(keys.length).toBeGreaterThanOrEqual(12);
	});

	/**
	 * Un filtre est ATTEIGNABLE si la surface peut l'ÉCRIRE — pas seulement le lire.
	 *
	 * Chercher `filter_x` n'importe où était insuffisant : les deux composants lisent
	 * l'URL pour refléter l'état courant (`searchParams.get("filter_showDeleted")`), donc
	 * un filtre lu mais jamais réglable passait le test. Vérifié en retirant l'option
	 * « Corbeille » du tiroir : le test restait vert.
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

	it.each([
		["feuille desktop", () => SHEET],
		["tiroir mobile", () => DRAWER],
	])("%s permet de RÉGLER les 12 filtres du schéma", (_surface, getSource) => {
		const source = getSource();

		const missing = keys.filter((key) => !isSettable(source, key));

		expect(
			missing,
			`Filtres non RÉGLABLES depuis cette surface : ${missing.join(", ")}. ` +
				`Un filtre exposé d'un seul côté rend la fonctionnalité inaccessible à la moitié ` +
				`des usages (l'admin travaille aussi depuis un téléphone).`,
		).toEqual([]);
	});
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

/**
 * @regression admin-list-pending-parity
 *
 * `SearchInput` pose `data-pending` sur son `<form role="search">`, mais cet
 * attribut n'avait aucun consommateur côté admin : seules la boutique
 * (`group/container`) et le quick search (`group/search`) déclaraient un groupe.
 * Les listes admin ne montraient donc rien pendant une recherche.
 *
 * Le correctif est une **paire** : `ADMIN_LIST_GROUP_CLASS` sur le conteneur de
 * page, `ADMIN_LIST_PENDING_CLASS` sur la racine de chaque liste. Poser l'une
 * sans l'autre ne produit **rien du tout**, en silence — et un grisement
 * à moitié appliqué est pire que pas de grisement. D'où ce garde-fou statique :
 * la dérive serait invisible à tout test de rendu (aucune erreur, juste un effet
 * absent sur certaines pages).
 */

const ROOT = process.cwd();

/** Pages de liste admin : toutes portent un `SearchInput` via Toolbar/StickyActionBar. */
const LIST_PAGES = [
	"app/admin/catalogue/produits/page.tsx",
	"app/admin/catalogue/produits/[slug]/variantes/page.tsx",
	"app/admin/catalogue/collections/page.tsx",
	"app/admin/catalogue/couleurs/page.tsx",
	"app/admin/catalogue/materiaux/page.tsx",
	"app/admin/catalogue/types-de-produits/page.tsx",
	"app/admin/ventes/commandes/page.tsx",
	"app/admin/ventes/remboursements/page.tsx",
];

function read(relative: string): string {
	return readFileSync(join(ROOT, relative), "utf8");
}

/**
 * Source **privée de ses lignes d'import**.
 *
 * Indispensable : chercher `ADMIN_LIST_GROUP_CLASS` dans le fichier brut est
 * toujours vrai dès que l'import existe, même si plus aucun JSX ne l'utilise.
 * Une première version de ce test faisait exactement cette erreur et restait
 * verte après retrait de la classe du `className` — vérifié en réinjectant le
 * défaut.
 */
function bodyWithoutImports(relative: string): string {
	return read(relative)
		.split("\n")
		.filter((line) => !/^\s*import\b/.test(line))
		.join("\n");
}

/** Racines de listes : la data-table partagée + toutes les mobile-lists admin. */
function listRootFiles(): string[] {
	const mobileLists = execSync("grep -rl AdminListLiveCount --include=*-mobile-list.tsx modules", {
		cwd: ROOT,
		encoding: "utf8",
	})
		.split("\n")
		.filter(Boolean);
	return ["shared/components/data-table/admin-data-table.tsx", ...mobileLists];
}

describe("état « recherche en cours » des listes admin", () => {
	it("chaque page de liste déclare le groupe", () => {
		const missing = LIST_PAGES.filter(
			(p) => !bodyWithoutImports(p).includes("ADMIN_LIST_GROUP_CLASS"),
		);

		expect(
			missing,
			`Pages sans ADMIN_LIST_GROUP_CLASS : ${missing.join(", ")}. Sans le groupe sur un ancêtre commun du champ et de la liste, le grisement ne se déclenche jamais sur cette page.`,
		).toEqual([]);
	});

	it("chaque racine de liste consomme la classe de pending", () => {
		const roots = listRootFiles();
		// Garde anti-« vert pour la mauvaise raison » : si le grep ne trouve plus
		// rien, la boucle serait vide et le test passerait sans rien vérifier.
		// Plancher 9 → 8 au retrait de la liste `/admin/clients` (2026-07-31).
		// Plancher 8 → 7 au retrait des codes promo (2026-08-05) : la liste
		// `/admin/marketing/discounts` part avec le modèle `Discount`.
		expect(roots.length).toBeGreaterThanOrEqual(7);

		const missing = roots.filter(
			(p) => !bodyWithoutImports(p).includes("ADMIN_LIST_PENDING_CLASS"),
		);

		expect(
			missing,
			`Racines de liste sans ADMIN_LIST_PENDING_CLASS : ${missing.join(", ")}.`,
		).toEqual([]);
	});

	it("le nom du groupe et celui de la variante correspondent", () => {
		// Le couple `group/<nom>` ↔ `group-has-…/<nom>` doit rester synchrone : une
		// renommage d'un seul côté compile sans erreur et ne fait plus rien.
		const styles = read("shared/components/admin-list-pending.styles.ts");
		const group = styles.match(/ADMIN_LIST_GROUP_CLASS\s*=\s*"group\/(\w+)"/)?.[1];
		const variants = [...styles.matchAll(/group-has-\[\[data-pending\]\]\/(\w+):/g)].map(
			(m) => m[1],
		);

		expect(group).toBeDefined();
		expect(variants.length).toBeGreaterThanOrEqual(3);
		expect(new Set(variants)).toEqual(new Set([group]));
	});
});

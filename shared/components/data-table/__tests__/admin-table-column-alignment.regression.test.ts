import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression admin-table-column-alignment-2026-07-26
 *
 * Le retrait de la machinerie bulk (commit 557da2c69) a supprimé le `<TableHead>`
 * de la colonne de sélection mais laissé le `<TableCell>` qui hébergeait le
 * marqueur informatif (cadenas « type système », étoile « variante par défaut »).
 * Résultat : une cellule de plus que d'en-têtes sur `skus` et `product-types`,
 * donc TOUTES les colonnes décalées d'un cran à l'écran, la colonne Actions sans
 * en-tête, et l'association `th`/`td` rompue (WCAG 1.3.1 — annonces lecteur
 * d'écran fausses).
 *
 * Cette garde vérifie statiquement, sur les 10 admin data-tables, que le nombre
 * de `<TableHead>` du header égale le nombre de `<TableCell>` d'une ligne de
 * corps. Elle attrape aussi bien l'oubli inverse (ajouter une colonne sans sa
 * cellule) que la réintroduction du défaut d'origine.
 *
 * Contrainte d'écriture : chaque `*-data-table.tsx` doit rendre ses colonnes de
 * façon statique (une cellule = un `<TableCell>` littéral, le conditionnel vit
 * DANS la cellule, jamais autour). Un `{cond && <TableCell>}` casserait ce test
 * — c'est voulu : une colonne conditionnelle casse aussi l'alignement en vrai.
 */
describe("Admin data-tables — alignement colonnes header/corps", () => {
	const modulesDir = join(process.cwd(), "modules");

	function findDataTables(): string[] {
		const found: string[] = [];
		for (const moduleName of readdirSync(modulesDir)) {
			const adminDir = join(modulesDir, moduleName, "components", "admin");
			let entries: string[];
			try {
				entries = readdirSync(adminDir);
			} catch {
				continue;
			}
			for (const entry of entries) {
				if (entry.endsWith("-data-table.tsx")) found.push(join(adminDir, entry));
			}
		}
		return found.sort();
	}

	/**
	 * Retire les commentaires JSX `{/* … *​/}` et les commentaires de ligne avant
	 * comptage : une prose qui cite un nom de balise (« défauts de TableCell »)
	 * ne doit pas être comptée comme une colonne.
	 *
	 * Volontairement limité à ces deux formes — un stripper générique risquerait
	 * d'avaler du JSX et de rendre le test vert pour la mauvaise raison.
	 */
	function stripComments(source: string): string {
		return source.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "").replace(/^[^\S\n]*\/\/.*$/gm, "");
	}

	/** Compte les occurrences de `TableHead` / `TableCell` ouvrants (pas `TableHeader`). */
	function countTag(source: string, tag: "TableHead" | "TableCell"): number {
		return (stripComments(source).match(new RegExp(`<${tag}(?![A-Za-z])`, "g")) ?? []).length;
	}

	const dataTables = findDataTables();

	it("découvre les 10 admin data-tables", () => {
		expect(dataTables.length).toBe(10);
	});

	it.each(dataTables.map((path) => [relative(process.cwd(), path), path] as const))(
		"%s — autant de <TableHead> que de <TableCell>",
		(_label, path) => {
			const source = readFileSync(path, "utf-8");
			const heads = countTag(source, "TableHead");
			const cells = countTag(source, "TableCell");

			expect(heads).toBeGreaterThan(0);
			expect(cells).toBe(heads);
		},
	);

	it.each(dataTables.map((path) => [relative(process.cwd(), path), path] as const))(
		"%s — pas de <TableCell> rendu conditionnellement (casserait l'alignement)",
		(_label, path) => {
			const source = readFileSync(path, "utf-8");
			// `{cond && <TableCell` ou `{cond ? <TableCell` en tête d'expression JSX.
			expect(source).not.toMatch(/[&?]\s*(?:\(\s*)?<TableCell(?![A-Za-z])/);
		},
	);

	it.each(dataTables.map((path) => [relative(process.cwd(), path), path] as const))(
		"%s — les largeurs de colonnes déclarées somment à 100 %%",
		(_label, path) => {
			const source = readFileSync(path, "utf-8");
			const widths = (source.match(/w-\[(\d+)%\]/g) ?? []).map((w) => Number(w.replace(/\D/g, "")));
			const heads = countTag(source, "TableHead");

			// Une table qui ne déclare aucune largeur laisse le layout auto : OK.
			if (widths.length === 0) return;

			// Sinon toutes les colonnes doivent en déclarer une, et la somme faire 100 %.
			// `table-fixed` renormalise silencieusement une somme partielle : les
			// pourcentages déclarés deviennent alors trompeurs.
			expect(widths.length).toBe(heads);
			expect(widths.reduce((a, b) => a + b, 0)).toBe(100);
		},
	);
});

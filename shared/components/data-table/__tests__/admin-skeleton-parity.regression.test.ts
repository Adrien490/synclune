import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression admin-skeleton-column-parity-2026-07-26
 *
 * Après le retrait de la machinerie bulk (commit 557da2c69), 8 des skeletons
 * admin ouvraient encore sur une colonne `checkbox` (ou `avatar`) disparue de la
 * table réelle, et 4 déclaraient `pagination="offset"` alors que toutes les
 * listes sont en pagination curseur. Le skeleton affichait donc N+1 colonnes
 * puis la table N : saut de colonnes visible à chaque chargement de liste.
 *
 * Cette garde compare statiquement, pour chaque module, le nombre de colonnes
 * déclarées dans `*-data-table-skeleton.tsx` au nombre de `<TableHead>` de
 * `*-data-table.tsx`, et impose `pagination="cursor"`.
 *
 * Complément de `admin-table-column-alignment.regression.test.ts`, qui verrouille
 * l'autre moitié du contrat (header ↔ corps à l'intérieur de la table réelle).
 */
describe("Admin skeletons — parité avec la table réelle", () => {
	const modulesDir = join(process.cwd(), "modules");

	type Pair = { module: string; skeleton: string; table: string };

	function findPairs(): Pair[] {
		const pairs: Pair[] = [];
		for (const moduleName of readdirSync(modulesDir)) {
			const adminDir = join(modulesDir, moduleName, "components", "admin");
			let entries: string[];
			try {
				entries = readdirSync(adminDir);
			} catch {
				continue;
			}
			const table = entries.find((e) => e.endsWith("-data-table.tsx"));
			const skeleton = entries.find((e) => e.endsWith("-data-table-skeleton.tsx"));
			if (table && skeleton) {
				pairs.push({
					module: moduleName,
					skeleton: join(adminDir, skeleton),
					table: join(adminDir, table),
				});
			}
		}
		return pairs.sort((a, b) => a.module.localeCompare(b.module));
	}

	const pairs = findPairs();

	it("chaque admin data-table a son skeleton", () => {
		expect(pairs.length).toBe(10);
	});

	it.each(pairs.map((p) => [p.module, p] as const))(
		"%s — le skeleton déclare autant de colonnes que la table",
		(_label, pair) => {
			const skeleton = readFileSync(pair.skeleton, "utf-8");
			const table = readFileSync(pair.table, "utf-8");

			// Une entrée de `columns` = un `cell:` (les autres clés sont optionnelles).
			const skeletonColumns = (skeleton.match(/\bcell:\s*\{/g) ?? []).length;
			const tableHeads = (table.match(/<TableHead(?![A-Za-z])/g) ?? []).length;

			expect(skeletonColumns).toBeGreaterThan(0);
			expect(skeletonColumns).toBe(tableHeads);
		},
	);

	it.each(pairs.map((p) => [p.module, p] as const))(
		'%s — le skeleton déclare pagination="cursor"',
		(_label, pair) => {
			const skeleton = readFileSync(pair.skeleton, "utf-8");
			expect(skeleton).toContain('pagination="cursor"');
			expect(skeleton).not.toContain('pagination="offset"');
		},
	);

	it.each(pairs.map((p) => [relative(process.cwd(), p.skeleton), p] as const))(
		"%s — aucune colonne de sélection résiduelle",
		(_label, pair) => {
			const skeleton = readFileSync(pair.skeleton, "utf-8");
			expect(skeleton).not.toMatch(/type:\s*"checkbox"/);
		},
	);
});

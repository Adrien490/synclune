/**
 * @regression regression-tag-references
 *
 * Tout tag `@regression <slug>` cité dans un commentaire de code SOURCE doit
 * exister dans un fichier de test.
 *
 * ⚠️ Un tag cité est une PROMESSE : « ce comportement est verrouillé, un test te
 * rattrapera si tu le casses ». Quand le test n'existe pas (jamais écrit, ou
 * supprimé sans purger la citation), la promesse est un mensonge silencieux — le
 * commentaire dissuade de toucher au code en s'appuyant sur un filet qui n'est
 * pas là. C'est arrivé deux fois de suite à `cart-sheet.tsx` : d'abord un CHEMIN
 * de test qui a dérivé (ce qui a motivé la référence « par TAG »), puis le tag
 * lui-même (`cart-sheet-list-not-clipped-2026-08-04`, pendu dans le vide
 * jusqu'à l'audit du 2026-08-15).
 *
 * Règle de correspondance : le suffixe de date (`-AAAA-MM-JJ`) est optionnel des
 * deux côtés — `cart-price-copy-matches-billing` cité en source matche
 * `cart-price-copy-matches-billing-2026-08-15` défini en test.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const SCAN_ROOTS = ["modules", "app", "shared", "test", "e2e"];
const TAG_REGEX = /@regression\s+([a-z0-9][a-z0-9-]*)/g;

/**
 * Dette CONSTATÉE à la création du test (audit panier 2026-08-15) : tags cités
 * en source dont le test n'a jamais existé. Chaque entrée porte sa raison ;
 * cette liste ne peut que RÉTRÉCIR — écrire le test manquant, puis retirer la
 * ligne. Ajouter une entrée est le mensonge que ce test existe pour empêcher.
 */
const KNOWN_MISSING: Record<string, string> = {
	// Cité par catalog.ts / product-catalog.tsx / catalog-shell.types.ts : la
	// parité load-more/filtres n'a jamais eu de suite dédiée.
	"catalog-loadmore-filter-parity": "test jamais écrit — à créer côté catalogue",
	// Cité par format-euro.ts : l'arrondi « à partir de » des collections n'a
	// jamais eu de suite dédiée.
	"collection-from-price-two-decimals": "test jamais écrit — à créer côté format-euro",
};

function isTestFile(path: string): boolean {
	return (
		/\.(test|spec)\.[jt]sx?$/.test(path) ||
		path.includes("__tests__") ||
		path.startsWith("test/") ||
		path.startsWith("e2e/")
	);
}

function walk(dir: string, out: string[]): void {
	for (const entry of readdirSync(dir)) {
		if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) walk(full, out);
		else if (/\.[jt]sx?$/.test(entry)) out.push(full);
	}
}

function collectFiles(): string[] {
	const files: string[] = [];
	for (const root of SCAN_ROOTS) {
		try {
			walk(join(REPO_ROOT, root), files);
		} catch {
			// racine absente (ex. e2e/ sur un checkout partiel) — non bloquant
		}
	}
	return files.map((f) => relative(REPO_ROOT, f));
}

/** Le suffixe de date est optionnel : on compare les slugs SANS lui. */
function stripDateSuffix(tag: string): string {
	return tag.replace(/-\d{4}-\d{2}-\d{2}$/, "");
}

function extractTags(source: string): string[] {
	return Array.from(source.matchAll(TAG_REGEX), (m) => m[1]!);
}

describe("contract: les tags @regression cités en source existent en test", () => {
	const files = collectFiles();

	const definedTags = new Set<string>();
	const citedBySource = new Map<string, string[]>();

	for (const file of files) {
		const source = readFileSync(join(REPO_ROOT, file), "utf8");
		for (const tag of extractTags(source)) {
			if (isTestFile(file)) {
				definedTags.add(stripDateSuffix(tag));
			} else {
				const citers = citedBySource.get(tag) ?? [];
				citers.push(file);
				citedBySource.set(tag, citers);
			}
		}
	}

	it("aucun tag cité hors dette documentée n'est orphelin", () => {
		const orphans: string[] = [];
		for (const [tag, citers] of citedBySource) {
			if (definedTags.has(stripDateSuffix(tag))) continue;
			if (stripDateSuffix(tag) in KNOWN_MISSING) continue;
			orphans.push(`${tag} (cité par ${citers.join(", ")})`);
		}
		expect(orphans, `Tags @regression cités sans test correspondant :\n${orphans.join("\n")}`) //
			.toEqual([]);
	});

	it("la dette documentée ne contient que des tags encore réellement manquants", () => {
		// Une entrée dont le test existe désormais doit être RETIRÉE de la liste —
		// sinon elle exempterait une future suppression du test.
		const stale = Object.keys(KNOWN_MISSING).filter((tag) => definedTags.has(tag));
		expect(stale, `Entrées de KNOWN_MISSING devenues inutiles : ${stale.join(", ")}`).toEqual([]);
	});

	it("le scan voit bien des tags des deux côtés (garde anti-régression du test lui-même)", () => {
		// Si la regex ou le walk casse, les deux collections se vident et le test
		// passerait pour toujours — on fige un plancher réaliste.
		expect(definedTags.size).toBeGreaterThan(50);
		expect(citedBySource.size).toBeGreaterThan(3);
	});
});

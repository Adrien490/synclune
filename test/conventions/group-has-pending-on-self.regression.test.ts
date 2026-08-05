import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression group-has-pending-on-self-2026-08-05
 *
 * Interdit la combinaison qui rend une variante `group-has-[[data-pending]]/<nom>`
 * SILENCIEUSEMENT MORTE : l'attribut `data-pending` posé sur l'élément qui déclare
 * lui-même `group/<nom>`.
 *
 * Tailwind compile `group-has-[[data-pending]]/sheet:opacity-50` en :
 *
 *     .group-has-\[\[data-pending\]\]\/sheet\:opacity-50
 *       :is(:where(.group\/sheet):has(:is([data-pending])) *)
 *
 * `:has()` ne matche JAMAIS son propre sujet. Si `data-pending` vit sur l'hôte du
 * groupe et non sur un descendant, le sélecteur ne peut pas matcher — la classe se
 * compile normalement, aucun outil ne bronche, et l'effet n'existe pas.
 *
 * C'est ce qui a rendu **17 variantes du panier inertes** : `cart-sheet.tsx` posait
 * `group/sheet` et `data-pending` sur le MÊME élément (le popup), si bien qu'aucune
 * mutation du panier — quantité, suppression, vidage — n'avait de retour visuel.
 * Le piège venait du commentaire de `shared/components/ui/sheet.tsx`, qui invitait
 * `group-has-*` alors que l'endroit naturel où un appelant pose `data-pending` est
 * justement l'élément auquel il passe `className`.
 *
 * Deux motifs CORRECTS, et ce test laisse passer les deux :
 *  - attribut sur l'HÔTE du groupe        → `group-data-pending/<nom>:`
 *  - attribut sur un DESCENDANT du groupe → `group-has-[[data-pending]]/<nom>:`
 *
 * Seule la combinaison « hôte + `group-has-*` » échoue.
 */

const REPO_ROOT = process.cwd();

const SCAN_ROOTS = [join(REPO_ROOT, "app"), join(REPO_ROOT, "modules"), join(REPO_ROOT, "shared")];

function walk(dir: string, out: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return out;
	}
	for (const entry of entries) {
		if (
			entry === "node_modules" ||
			entry === ".next" ||
			entry === "dist" ||
			entry === "generated" ||
			entry === "__tests__" ||
			entry === "__mocks__" ||
			entry.startsWith(".")
		) {
			continue;
		}
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			walk(full, out);
		} else if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) {
			out.push(full);
		}
	}
	return out;
}

const sourceFiles = SCAN_ROOTS.flatMap((root) => walk(root));

/**
 * Retire les commentaires avant analyse.
 *
 * ⚠️ Indispensable, et ça a été prouvé à l'écriture de ce test : les commentaires
 * qui DOCUMENTENT le piège citent forcément `group/sheet` et
 * `group-has-[[data-pending]]/sheet:` en toutes lettres — sans ce filtre, le
 * garde-fou accusait `shared/components/ui/sheet.tsx` et
 * `cart-item-quantity-selector.tsx` sur la seule foi de leur propre JSDoc.
 * Les espaces sont préservés pour ne pas décaler les index de position.
 */
function stripComments(src: string): string {
	return src
		.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
		.replace(
			/(^|[^:/])\/\/[^\n]*/g,
			(m, keep: string) => keep + " ".repeat(m.length - keep.length),
		);
}

const sources = new Map(sourceFiles.map((f) => [f, stripComments(readFileSync(f, "utf8"))]));

/**
 * Extrait la balise OUVRANTE qui contient la position `at`, en équilibrant les
 * accolades JSX et en ignorant les `>` qui vivent dans une expression (`=>`,
 * comparaisons, génériques). Retourne `null` si `at` n'est pas dans une balise.
 */
function enclosingOpeningTag(src: string, at: number): string | null {
	// Reculer jusqu'au `<` d'une balise JSX (`<Foo`, `<div`), sans traverser un `>`
	// fermant : s'il y en a un, `at` est dans le CORPS de l'élément, pas sa balise.
	let start = -1;
	for (let i = at; i >= 0; i--) {
		const c = src[i];
		if (c === ">") return null;
		if (c === "<" && /[A-Za-z]/.test(src[i + 1] ?? "")) {
			start = i;
			break;
		}
	}
	if (start === -1) return null;

	let depth = 0;
	for (let i = start; i < src.length; i++) {
		const c = src[i];
		if (c === "{") depth++;
		else if (c === "}") depth--;
		else if (c === ">" && depth === 0) return src.slice(start, i + 1);
	}
	return null;
}

/** Noms de groupe consommés par une variante `group-has-[[data-pending]]/<nom>`. */
function consumedGroupNames(): Set<string> {
	const names = new Set<string>();
	for (const src of sources.values()) {
		for (const m of src.matchAll(/group-has-\[\[data-pending\]\]\/([a-zA-Z][\w-]*)\s*:/g)) {
			names.add(m[1]!);
		}
	}
	return names;
}

/** Éléments déclarant `group/<nom>` ET portant `data-pending` sur la même balise. */
function collapsedHosts(): { file: string; group: string }[] {
	const hits: { file: string; group: string }[] = [];
	for (const [file, src] of sources) {
		for (const m of src.matchAll(/\bdata-pending\s*=/g)) {
			const tag = enclosingOpeningTag(src, m.index!);
			if (!tag) continue;
			for (const g of tag.matchAll(/(?<![\w-])group\/([a-zA-Z][\w-]*)/g)) {
				hits.push({ file: relative(REPO_ROOT, file), group: g[1]! });
			}
		}
	}
	return hits;
}

describe("@regression group-has-pending-on-self", () => {
	it("balaie un périmètre réel", () => {
		expect(sourceFiles.length).toBeGreaterThan(300);
		expect(sourceFiles.map((f) => relative(REPO_ROOT, f))).toContain(
			join("shared", "components", "ui", "sheet.tsx"),
		);
	});

	it("`data-pending` n'est jamais sur l'hôte d'un groupe consommé par `group-has-*`", () => {
		const consumed = consumedGroupNames();
		const offenders = collapsedHosts()
			.filter(({ group }) => consumed.has(group))
			.map(
				({ file, group }) =>
					`${file} — \`data-pending\` est sur l'élément qui déclare \`group/${group}\`, ` +
					`or une variante \`group-has-[[data-pending]]/${group}\` existe : elle est morte. ` +
					`Utiliser \`group-data-pending/${group}\`, ou déplacer l'attribut sur un descendant.`,
			);

		expect(offenders).toEqual([]);
	});

	it("le panier consomme bien `group-data-pending/sheet` et plus `group-has-*`", () => {
		// Ancre le correctif de 2026-08-05 : ces 5 fichiers portaient les 17 variantes
		// mortes. Si l'un repasse en `group-has-*`, le test ci-dessus le rattrape déjà —
		// celui-ci nomme la surface pour que l'échec soit lisible.
		const cartFiles = [
			join("modules", "cart", "components", "cart-sheet.tsx"),
			join("modules", "cart", "components", "cart-sheet-footer.tsx"),
			join("modules", "cart", "components", "cart-sheet-item-row.tsx"),
			join("modules", "cart", "components", "cart-clear-button.tsx"),
		];
		for (const rel of cartFiles) {
			const src = readFileSync(join(REPO_ROOT, rel), "utf8");
			expect(src, `${rel} ne doit plus consommer group-has sur /sheet`).not.toMatch(
				/group-has-\[\[data-pending\]\]\/sheet\s*:/,
			);
		}
	});

	it("la ligne du panier a un producteur `data-pending` pour `group/item`", () => {
		// Les variantes `group-has-[[data-pending]]/item:` de `cart-sheet-item-row.tsx`
		// sont correctes (attribut attendu sur un descendant) mais restaient sans aucun
		// producteur : le prix de la ligne ne signalait rien au tap de quantité.
		const selector = readFileSync(
			join(REPO_ROOT, "modules", "cart", "components", "cart-item-quantity-selector.tsx"),
			"utf8",
		);
		expect(selector).toMatch(/data-pending=\{isLoading \? "" : undefined\}/);

		const row = readFileSync(
			join(REPO_ROOT, "modules", "cart", "components", "cart-sheet-item-row.tsx"),
			"utf8",
		);
		expect(row).toMatch(/group-has-\[\[data-pending\]\]\/item\s*:/);
	});
});

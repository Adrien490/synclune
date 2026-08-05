/**
 * @regression brand-wordmark-ssot
 *
 * Le nom de la marque était DESSINÉ à trois endroits et NOMMÉ à quatre.
 *
 * Dessins concurrents (audit logo 2026-08-05) :
 *   - `logo.tsx` — via `showText`
 *   - `admin-sidebar.tsx` — un `<span class="font-cursive … tracking-wide">` recopié
 *   - `menu-sheet.tsx` — un `<SheetTitle class="font-cursive … text-xl">`
 *
 * Noms accessibles concurrents, pour trois destinations qui n'en font que deux :
 *   « Synclune - Accueil » · « Synclune - Retour à l'accueil » ·
 *   « Synclune - Administration » · « Synclune » nu
 *
 * Ce n'est pas une redondance cosmétique : `e2e/navigation.spec.ts` a dû passer
 * `exact: true` parce que `/Accueil/i` matchait deux éléments, et le rail admin
 * annonçait « Synclune — Créations artisanales faites main Synclune » (l'`alt`
 * de l'image PLUS le span recopié).
 *
 * Depuis le lot 0.2, `shared/components/logo.tsx` est la SSOT des deux :
 * `LogoWordmark` pour le dessin, `brandLinkLabel()` pour le libellé.
 *
 * ⚠️ Ce test ne dit PAS que `font-cursive` est réservée au logo. La police sert
 * aussi aux signatures « — Léane » et aux intertitres décoratifs, ce qui est un
 * usage documenté (`shared/styles/fonts.ts`). Il dit qu'aucune surface ne doit
 * re-dessiner LE NOM DE LA MARQUE elle-même.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const SCAN_DIRS = ["app", "modules", "shared", "emails"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__tests__", "__snapshots__"]);

/** La SSOT elle-même : c'est le seul fichier autorisé à faire les deux. */
const SSOT = join("shared", "components", "logo.tsx");

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (entry.endsWith(".tsx") || entry.endsWith(".ts")) out.push(full);
	}
	return out;
}

function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
		.replace(/^[ \t]*\/\/.*$/gm, "");
}

function sourceFiles(): { path: string; source: string }[] {
	const files: { path: string; source: string }[] = [];
	for (const dir of SCAN_DIRS) {
		for (const full of walk(join(REPO_ROOT, dir))) {
			const rel = relative(REPO_ROOT, full);
			if (rel.split("/").join(sep) === SSOT) continue;
			files.push({ path: rel, source: stripComments(readFileSync(full, "utf8")) });
		}
	}
	return files;
}

/**
 * Fenêtre volontairement étroite : un fichier peut légitimement contenir les
 * DEUX (le pied de page signe « — Léane » en `font-cursive` et cite `BRAND.name`
 * dans son copyright). Ce qui est interdit, c'est que le nom soit l'ENFANT d'un
 * élément en `font-cursive` — donc à quelques dizaines de caractères de la
 * classe, pas n'importe où dans le fichier.
 */
const WORDMARK_WINDOW = 160;

function redrawsWordmark(source: string): boolean {
	let index = source.indexOf("font-cursive");
	while (index !== -1) {
		const window = source.slice(index, index + WORDMARK_WINDOW);
		// `{BRAND.name}` rendu comme enfant, ou le mot posé en dur dans le JSX.
		if (/\{\s*BRAND\.name\s*\}/.test(window) || />\s*Synclune\s*</.test(window)) return true;
		index = source.indexOf("font-cursive", index + 1);
	}
	return false;
}

/**
 * Les libellés de DESTINATION — c'est cette famille-là qui avait divergé.
 * « Synclune - Bijoux artisanaux faits main » (titre SEO) ou
 * « Synclune — Créations artisanales faites main » (alt de l'image) ne sont pas
 * des noms de lien et n'ont rien à faire dans ce gabarit.
 */
const HANDWRITTEN_LINK_LABEL = /["'`]\s*Synclune\s*[-—]\s*(Accueil|Administration|Retour)/i;

describe("@regression brand-wordmark-ssot", () => {
	it("aucune surface ne redessine le nom de la marque en font-cursive", () => {
		const offenders = sourceFiles()
			.filter(({ source }) => redrawsWordmark(source))
			.map(({ path }) => path)
			.sort();

		expect(
			offenders,
			"Le wordmark a UNE implémentation : `LogoWordmark` (shared/components/logo.tsx). " +
				"Ces fichiers posent le nom de la marque dans un élément `font-cursive` — " +
				"c'est un second dessin du même mot, à maintenir en parallèle.",
		).toEqual([]);
	});

	it("aucune surface n'écrit à la main un nom accessible de lien de marque", () => {
		const offenders = sourceFiles()
			.filter(({ source }) => HANDWRITTEN_LINK_LABEL.test(source))
			.map(({ path }) => path)
			.sort();

		expect(
			offenders,
			"Le nom accessible d'un lien de marque vient de `brandLinkLabel(href)` " +
				"(shared/components/logo.tsx). Quatre libellés pour deux destinations, c'est ce " +
				"que ce garde-fou ferme.",
		).toEqual([]);
	});
});

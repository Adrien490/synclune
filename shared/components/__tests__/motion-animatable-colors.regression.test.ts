/**
 * @regression motion-animatable-colors
 *
 * Aucune prop d'animation Motion (`animate`, `initial`, `exit`, `while*`) ne porte
 * de couleur `var(--…)`, `oklch()`, `lab()`, `color-mix()` — ni aucune autre notation
 * CSS Color 4/5.
 *
 * ## Pourquoi (cœur favoris, 2026-08-04)
 *
 * `AnimatedHeartIcon` animait `fill` / `stroke` de `rgba(0,0,0,0)` vers `var(--primary)`.
 * Motion résout la variable via `getComputedStyle`, et tombe donc sur la valeur calculée
 * du token — `oklch(0.8593 0.097 340.78)` (`app/globals.css`). Deux dégâts :
 *
 * 1. Motion n'interpole que RGB / HSL / hex. Tout le reste déclenche
 *    « … is not an animatable color » et **bascule sèchement** au lieu du fondu — le
 *    défaut est silencieux à l'œil (le cœur change bien d'état), visible en console.
 * 2. Les moteurs sérialisent la valeur calculée d'un `oklch()` en `lab(…)` — vérifié sur
 *    WebKit (`lab(82.3361% 30.5722 -11.7185)`) comme sur Chromium (`lab(82.3361 30.5722
 *    -11.7185)`, sans le `%`). Chercher « oklch » dans la console ne ramène donc rien :
 *    c'est le même token, sous un autre nom, et ce n'est pas un défaut propre à Safari.
 *
 * Le correctif ne duplique PAS le rose en hex — `--primary` est SSOT (`app/globals.css`
 * l'énonce explicitement). Il superpose deux tracés aux couleurs **statiques** et anime
 * leur `opacity`, qui est toujours interpolable.
 *
 * ## Portée
 *
 * Le scan couvre les props d'animation écrites en littéral d'objet dans le JSX, plus les
 * objets `const …Variants`. Une couleur passée par une variable intermédiaire lui échappe :
 * la règle reste « une couleur animée est un hex/rgb/hsl littéral », ce test en verrouille
 * la forme la plus courante.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__snapshots__"]);

/** Props Motion dont la valeur est une CIBLE d'animation (`style` en est exclu : statique). */
const ANIMATION_PROPS =
	/\b(animate|initial|exit|whileHover|whileTap|whileFocus|whileDrag|whileInView)\s*=\s*\{/g;

/** Objets de variants, seconde forme sous laquelle une cible d'animation est écrite. */
const VARIANTS_CONST = /\bconst\s+\w*[Vv]ariants\b[^=]*=\s*\{/g;

/**
 * Notations que Motion ne sait pas interpoler. `var(--…)` est inclus parce qu'il RÉSOUT
 * vers l'une d'elles : nos tokens de couleur sont tous des `oklch()`.
 */
const NON_ANIMATABLE_COLOR = /var\(--|\boklch\(|\boklab\(|\blab\(|\blch\(|\bhwb\(|\bcolor-mix\(/;

function collectSourceFiles(): string[] {
	const files: string[] = [];

	function walk(absDir: string) {
		for (const entry of readdirSync(absDir)) {
			if (SKIP_DIRS.has(entry)) continue;
			const abs = join(absDir, entry);
			if (statSync(abs).isDirectory()) {
				walk(abs);
				continue;
			}
			if (!/\.tsx?$/.test(entry) || entry.endsWith(".d.ts")) continue;
			if (/\.(test|spec)\.tsx?$/.test(entry)) continue;
			files.push(relative(REPO_ROOT, abs).split(sep).join("/"));
		}
	}

	for (const dir of SCAN_DIRS) walk(join(REPO_ROOT, dir));
	return files.sort();
}

/**
 * Rend le fragment allant de l'accolade ouvrante `openIndex` à sa fermante.
 * Saute chaînes et commentaires : un `}` y est du texte, pas une fermeture.
 */
function readBalancedBraces(source: string, openIndex: number): string {
	let depth = 0;

	for (let i = openIndex; i < source.length; i++) {
		const ch = source[i]!;
		const next = source[i + 1];

		if (ch === "/" && next === "/") {
			i = source.indexOf("\n", i);
			if (i === -1) break;
			continue;
		}
		if (ch === "/" && next === "*") {
			const end = source.indexOf("*/", i + 2);
			if (end === -1) break;
			i = end + 1;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			for (i++; i < source.length; i++) {
				if (source[i] === "\\") i++;
				else if (source[i] === ch) break;
			}
			continue;
		}

		if (ch === "{") depth++;
		else if (ch === "}" && --depth === 0) return source.slice(openIndex, i + 1);
	}

	return source.slice(openIndex);
}

function findOffenders(pattern: RegExp): string[] {
	const offenders: string[] = [];

	for (const file of collectSourceFiles()) {
		const source = readFileSync(join(REPO_ROOT, file), "utf8");
		const matcher = new RegExp(pattern.source, pattern.flags);

		for (const match of source.matchAll(matcher)) {
			const openIndex = match.index + match[0].length - 1;
			const block = readBalancedBraces(source, openIndex);
			const hit = NON_ANIMATABLE_COLOR.exec(block);
			if (!hit) continue;

			const line = source.slice(0, openIndex).split("\n").length;
			offenders.push(`${file}:${line} — ${match[1] ?? "variants"} contient « ${hit[0]}… »`);
		}
	}

	return offenders;
}

describe("@regression motion-animatable-colors", () => {
	it("aucune prop d'animation Motion ne cible une couleur non interpolable", () => {
		expect(findOffenders(ANIMATION_PROPS)).toEqual([]);
	});

	it("aucun objet de variants ne cible une couleur non interpolable", () => {
		expect(findOffenders(VARIANTS_CONST)).toEqual([]);
	});

	it("le scan voit bien les props d'animation (garde-fou anti-scan-vide)", () => {
		// Regex neuve par fichier : `.test()` sur un motif `/g` avance `lastIndex`,
		// donc un motif partagé sauterait le début des fichiers suivants.
		const withAnimationProps = collectSourceFiles().filter((file) =>
			new RegExp(ANIMATION_PROPS.source).test(readFileSync(join(REPO_ROOT, file), "utf8")),
		);

		expect(withAnimationProps.length).toBeGreaterThan(10);
	});

	it("détecte le défaut d'origine si on le réintroduit", () => {
		const original = `<m.path animate={{ fill: isFilled ? "var(--primary)" : "rgba(0,0,0,0)" }} />`;
		const openIndex = original.indexOf("{", original.indexOf("animate="));

		expect(NON_ANIMATABLE_COLOR.test(readBalancedBraces(original, openIndex))).toBe(true);
	});
});

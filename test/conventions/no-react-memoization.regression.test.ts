import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression react19-no-memoization-2026-05-28
 *
 * Garantit qu'aucun composant ou hook applicatif n'utilise `useMemo`,
 * `useCallback`, `React.memo` ou `memo()` directement. Le compilateur React 19
 * (`reactCompiler: true` dans `next.config.ts`) auto-mémoïse les valeurs et
 * callbacks ; ces wrappers explicites sont redondants et ajoutent une closure
 * + des deps à maintenir manuellement.
 *
 * Convention figée dans CLAUDE.md § "React 19 - NO MEMOIZATION".
 *
 * Périmètre : `shared/**`, `modules/**`, `app/**`, `emails/**`. Tests et
 * `__mocks__` exclus.
 *
 * La seconde suite du fichier verrouille la contrepartie : `reactCompiler: true`
 * dans `next.config.ts`. Interdire la mémoïsation manuelle SANS garantir que le
 * compilateur tourne laisserait l'application sans aucune optimisation, la suite
 * restant verte.
 */

const REPO_ROOT = process.cwd();

// `shared` en entier, pas seulement `components` + `hooks` : `shared/contexts`,
// `shared/lib`, `shared/stores` et `shared/utils` hébergent eux aussi du code
// React (contextes, providers, wrappers) et échappaient au garde-fou.
const SCAN_ROOTS = [
	join(REPO_ROOT, "shared"),
	join(REPO_ROOT, "modules"),
	join(REPO_ROOT, "app"),
	join(REPO_ROOT, "emails"),
];

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
		const stat = statSync(full);
		if (stat.isDirectory()) {
			walk(full, out);
		} else if (
			(entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
			!entry.endsWith(".test.ts") &&
			!entry.endsWith(".test.tsx") &&
			!entry.endsWith(".d.ts")
		) {
			out.push(full);
		}
	}
	return out;
}

function relPath(abs: string): string {
	return relative(REPO_ROOT, abs).replaceAll("\\", "/");
}

// Tournures interdites côté applicatif. On exclut volontairement `useEffectEvent`,
// `useTransition`, `useDeferredValue` qui ne sont pas de la mémoïsation manuelle.
//
// ⚠️ Le motif de l'import était écrit `/from\s+["']react["'][^;]*\bmemo\b/`, qui
// exige que `memo` apparaisse APRÈS `from "react"` : dans un import réel il est
// AVANT, donc la regex ne capturait rien — pas même
// `import { memo } from "react"` suivi de `const X = memo(Y)`. Deux motifs le
// remplacent : l'import et l'appel, chacun prouvé rouge par injection.
const FORBIDDEN_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
	{ name: "useMemo", pattern: /\buseMemo\s*\(/ },
	{ name: "useCallback", pattern: /\buseCallback\s*\(/ },
	{ name: "React.memo", pattern: /\bReact\.memo\s*\(/ },
	{ name: "import de memo depuis react", pattern: /import[^;]*\bmemo\b[^;]*from\s+["']react["']/ },
	// `(?<![.\w])` écarte `React.memo(` (déjà couvert au-dessus) et tout `x.memo(`.
	// `useMemo(` ne matche pas : la casse diffère (`Memo` ≠ `memo`), et `memoize(`
	// non plus, `\s*\(` exigeant la parenthèse immédiatement après `memo`.
	{ name: "appel memo()", pattern: /(?<![.\w])memo\s*\(/ },
];

describe("React 19 — pas de mémoisation manuelle", () => {
	const allFiles = SCAN_ROOTS.flatMap((root) => walk(root));

	it("le périmètre scanné n'est pas vide", () => {
		// Un `SCAN_ROOTS` qui pointerait à côté (renommage de dossier) rendrait les
		// 5 assertions suivantes vertes sur ZÉRO fichier.
		expect(allFiles.length).toBeGreaterThan(500);
	});

	for (const { name, pattern } of FORBIDDEN_PATTERNS) {
		it(`aucun appel à ${name} dans le code applicatif`, () => {
			const offenders = allFiles
				.filter((f) => {
					const content = readFileSync(f, "utf-8");
					// Strip line + block comments avant la recherche pour éviter les faux
					// positifs dans la documentation (JSDoc explicitement référencé).
					const stripped = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
					return pattern.test(stripped);
				})
				.map(relPath);

			expect(offenders).toEqual([]);
		});
	}
});

/**
 * La suite ci-dessus verrouille la CONSÉQUENCE (pas de mémoïsation manuelle) ;
 * celle-ci verrouille la CAUSE. Sans elle, retirer `reactCompiler` de
 * `next.config.ts` laisserait toute la suite verte et l'application sans aucune
 * auto-mémoïsation — la convention deviendrait une interdiction sans contrepartie.
 */
describe("React Compiler — activé sur tout le code applicatif", () => {
	const nextConfig = readFileSync(join(REPO_ROOT, "next.config.ts"), "utf-8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, "");

	it("`reactCompiler` vaut `true` dans next.config.ts", () => {
		expect(nextConfig).toMatch(/^\s*reactCompiler:\s*true\s*,/m);
	});

	it('le compilateur n\'est pas en mode opt-in (`compilationMode: "annotation"`)', () => {
		// En mode annotation, seuls les composants portant `"use memo"` sont
		// compilés — le dépôt n'en a aucun, l'optimisation serait donc nulle.
		expect(nextConfig).not.toMatch(/compilationMode/);
	});

	it("aucun fichier applicatif ne s'exclut du compilateur", () => {
		const optOuts = SCAN_ROOTS.flatMap((root) => walk(root)).filter((f) =>
			/["']use no (memo|forget)["']/.test(readFileSync(f, "utf-8")),
		);

		expect(optOuts.map(relPath)).toEqual([]);
	});
});

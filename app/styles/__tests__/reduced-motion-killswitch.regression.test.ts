/**
 * @regression reduced-motion-killswitch
 *
 * Le bloc `@media (prefers-reduced-motion: reduce)` de `app/styles/animations.css`
 * est le killswitch central des animations CSS. Audit « Animations & reduced
 * motion » 2026-08-03, deux dérives constatées :
 *
 * 1. **Sélecteurs morts** : 10 des 13 sélecteurs du bloc ne correspondaient plus
 *    à rien (classes supprimées avec la landing), dont `.doodle-draw-scroll` qui
 *    n'a JAMAIS été défini nulle part. Un killswitch plein de sélecteurs morts
 *    entretient l'illusion d'une couverture large.
 * 2. **Trou `.animate-out`** : seul `.animate-in` était neutralisé (`!important`).
 *    `tw-animate-css` n'a aucune règle reduced-motion, et un
 *    `motion-reduce:animate-none` au call site perd en spécificité contre
 *    `data-[state=closed]:animate-out` (0,1,0 vs 0,2,0) — la fermeture du mega
 *    menu restait animée sous reduced-motion alors que l'ouverture était
 *    instantanée.
 *
 * Trois règles :
 * a) chaque classe listée dans le killswitch a au moins un consommateur réel ;
 * b) chaque `@keyframes` custom du projet est consommé (déclaration `animation`
 *    en CSS ou arbitraire Tailwind `animate-[nom_…]` en TSX) ;
 * c) `.animate-in` ET `.animate-out` sont tous deux tués en `!important`.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared", "e2e"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__snapshots__"]);

/**
 * Classes Tailwind core dont le consommateur est généré par Tailwind lui-même
 * (le grep source les trouve quand même via `motion-safe:animate-pulse` etc.,
 * mais on les documente ici pour la lisibilité du contrat).
 */
const KNOWN_UTILITY_CLASSES = new Set(["animate-in", "animate-out", "animate-pulse"]);

function collectFiles(extensions: RegExp): string[] {
	const files: string[] = [];

	function walk(absDir: string) {
		for (const entry of readdirSync(absDir)) {
			if (SKIP_DIRS.has(entry)) continue;
			const abs = join(absDir, entry);
			if (statSync(abs).isDirectory()) {
				walk(abs);
				continue;
			}
			if (!extensions.test(entry)) continue;
			files.push(relative(REPO_ROOT, abs).split(sep).join("/"));
		}
	}

	for (const dir of SCAN_DIRS) walk(join(REPO_ROOT, dir));
	return files.sort();
}

/** Extrait le bloc reduced-motion (accolades appariées) d'un contenu CSS. */
function extractReducedMotionBlock(css: string): string {
	const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
	expect(start, "bloc @media (prefers-reduced-motion: reduce) introuvable").toBeGreaterThan(-1);
	const open = css.indexOf("{", start);
	let depth = 1;
	let i = open + 1;
	while (depth > 0 && i < css.length) {
		if (css[i] === "{") depth++;
		if (css[i] === "}") depth--;
		i++;
	}
	return css.slice(open + 1, i - 1);
}

describe("@regression reduced-motion-killswitch", () => {
	const animationsCss = readFileSync(join(REPO_ROOT, "app/styles/animations.css"), "utf-8");
	const killswitch = extractReducedMotionBlock(animationsCss);

	// Les .spec/.test sont inclus volontairement : `.animate-heart-beat` n'a
	// AUCUN call site produit — c'est le canari du killswitch, injecté par
	// e2e/toast-ui.spec.ts sous emulateMedia({reducedMotion}).
	const sourceFiles = collectFiles(/\.(tsx?|css)$/).filter((f) => !f.endsWith(".d.ts"));
	const sourceContents = sourceFiles.map((f) => ({
		path: f,
		content: readFileSync(join(REPO_ROOT, f), "utf-8"),
	}));

	it("chaque classe du killswitch a un consommateur réel dans le repo", () => {
		const classNames = new Set(
			[...killswitch.matchAll(/\.([A-Za-z0-9_-]+)/g)]
				.map((m) => m[1])
				.filter((s): s is string => s !== undefined),
		);
		expect(classNames.size).toBeGreaterThan(3);

		const orphans: string[] = [];
		for (const className of classNames) {
			const hasConsumer = sourceContents.some(({ path, content }) => {
				// La définition dans animations.css ne compte pas comme consommateur.
				if (path === "app/styles/animations.css") {
					return false;
				}
				return content.includes(className);
			});
			if (!hasConsumer && !KNOWN_UTILITY_CLASSES.has(className)) {
				orphans.push(className);
			}
		}

		expect(
			orphans,
			"Sélecteur du killswitch reduced-motion sans consommateur — retirer la " +
				"règle morte ou restaurer le consommateur :\n" +
				orphans.join("\n"),
		).toEqual([]);
	});

	it("chaque @keyframes custom du projet est consommé", () => {
		const cssFiles = sourceContents.filter(({ path }) => path.endsWith(".css"));

		const orphans: string[] = [];
		for (const { path, content } of cssFiles) {
			const keyframes = [...content.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)/g)]
				.map((m) => m[1])
				.filter((s): s is string => s !== undefined);
			for (const name of keyframes) {
				const consumed = sourceContents.some(({ path: p, content: c }) => {
					// Déclaration CSS `animation: <name>` / `animation-name: <name>`
					// hors de la définition @keyframes elle-même.
					const animationDecl = new RegExp(`animation(?:-name)?\\s*:[^;]*\\b${name}\\b`);
					if (p.endsWith(".css") && animationDecl.test(c)) return true;
					// Arbitraire Tailwind `animate-[<name>_…]` côté TSX.
					if (!p.endsWith(".css") && c.includes(`animate-[${name}`)) return true;
					return false;
				});
				if (!consumed) orphans.push(`${name} (${path})`);
			}
		}

		expect(
			orphans,
			"@keyframes défini mais consommé nulle part (ni déclaration `animation:` " +
				"en CSS, ni arbitraire `animate-[…]` en TSX) — supprimer, ou brancher " +
				"un consommateur :\n" +
				orphans.join("\n"),
		).toEqual([]);
	});

	/**
	 * Le SENS INVERSE de la règle (a), ajouté le 2026-08-05.
	 *
	 * Le contrat ne vérifiait que « killswitch → consommateur » : il attrapait les
	 * sélecteurs morts, mais pas l'oubli symétrique — une classe `.animate-*` DÉFINIE ici
	 * et absente du killswitch. Prouvé en retirant `.animate-sparkle-pulse-once` du bloc :
	 * la suite restait verte, alors que l'animation continuait de tourner sous
	 * `prefers-reduced-motion: reduce`.
	 *
	 * C'est le même motif bidirectionnel que l'allowlist de `handleOnly` et que la parité
	 * de schéma : un contrat à sens unique laisse toujours passer l'oubli de l'autre côté.
	 */
	it("chaque classe .animate-* définie dans le fichier est neutralisée par le killswitch", () => {
		const declaration = /^[ \t]*\.(animate-[a-z0-9-]+)[\s,{]/gm;
		const defined = new Set(
			[...animationsCss.matchAll(declaration)]
				.map((m) => m[1])
				.filter((s): s is string => s !== undefined),
		);
		const neutralized = new Set(
			[...killswitch.matchAll(/\.(animate-[a-z0-9-]+)/g)]
				.map((m) => m[1])
				.filter((s): s is string => s !== undefined),
		);

		const unguarded = [...defined].filter((c) => !neutralized.has(c)).sort();
		expect(
			unguarded,
			"Classe d'animation définie mais NON neutralisée sous `prefers-reduced-motion` — " +
				"l'ajouter au bloc du killswitch :\n" +
				unguarded.map((c) => `  .${c}`).join("\n"),
		).toEqual([]);

		// Filet du filet : si la regex de collecte cesse de matcher, le test passerait
		// vide et ne garderait plus rien.
		expect(defined.size).toBeGreaterThanOrEqual(6);
	});

	it(".animate-in ET .animate-out sont neutralisés en !important", () => {
		// Les deux classes doivent partager la règle `animation: none !important` :
		// tw-animate-css ne gère pas reduced-motion, et sans !important un
		// `data-[state=*]:animate-*` (0,2,0) bat toute compensation à (0,1,0).
		const rule = killswitch.match(
			/\.animate-in\s*,\s*\.animate-out\s*\{[^}]*animation:\s*none\s*!important/,
		);
		expect(
			rule,
			"Le killswitch doit contenir `.animate-in, .animate-out { animation: none !important }`",
		).not.toBeNull();
	});
});

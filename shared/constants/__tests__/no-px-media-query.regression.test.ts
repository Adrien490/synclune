/**
 * @regression no-px-media-query
 *
 * Garde-fou repo-wide : **aucun seuil de largeur en px** dans un `matchMedia()`
 * ou dans une media query CSS écrite à la main.
 *
 * ## Le bug que ce test verrouille
 *
 * Tailwind v4 exprime ses breakpoints en rem (`md:` = `48rem`). Les seuils JS
 * du repo étaient en px (`MOBILE_BREAKPOINT = 768`, `useMediaQuery("(min-width:
 * 768px)")`). Tant que la police racine vaut 16px les deux coïncident — mais
 * dès que l'utilisateur change la taille de police par défaut de son navigateur
 * (réglage d'accessibilité courant, WCAG 1.4.4), les breakpoints CSS se
 * déplacent et les seuils JS restent figés.
 *
 * Les composants « hybrides » — branche choisie en JS, branche rendue avec une
 * classe `md:` — tombent alors dans le vide. À police racine 14px (`md:` =
 * 672px), fenêtre 700px :
 *
 * - `useIsMobile()` renvoyait `true` → `AdminSidebar` (`disableMobileSheet`)
 *   rendait `null` ;
 * - le CSS considérait déjà l'écran comme desktop → `AdminMobileHeader`
 *   (`md:hidden`) caché, bottom bar cachée, `DashboardHeader` visible avec un
 *   `SidebarTrigger` pilotant une sidebar inexistante.
 *
 * → `/admin` sans **aucune** surface de navigation sur toute la plage 672-767px.
 * Audit « Confort desktop et robustesse du responsive » 2026-07-26, P1-1.
 *
 * ## La règle
 *
 * Passer par `mediaBelow()` / `mediaAtLeast()` / `mediaBetween()`
 * (`shared/constants/breakpoints.ts`). Les media queries CSS écrites à la main
 * s'expriment en rem, avec les mêmes valeurs que l'échelle Tailwind.
 *
 * Les media queries **sans largeur** (`prefers-reduced-motion`, `hover`,
 * `pointer`, `orientation`, `forced-colors`…) ne sont pas concernées : seules
 * les largeurs se désynchronisent.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

import { BREAKPOINTS, mediaBelow } from "../breakpoints";
import { MOBILE_MEDIA_QUERY } from "@/shared/hooks/use-mobile";

const REPO_ROOT = join(__dirname, "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__snapshots__"]);

/**
 * Fichiers autorisés à contenir un seuil de largeur en px. Toute addition ici
 * doit être justifiée en commentaire.
 */
const ALLOWLIST = new Set<string>([
	// Ce fichier — sa documentation cite les patterns interdits.
	"shared/constants/__tests__/no-px-media-query.regression.test.ts",
]);

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
			// Les tests n'expédient rien : `use-media-query.test.ts` passe
			// légitimement des chaînes arbitraires au hook générique.
			if (/\.(test|spec)\.tsx?$/.test(entry) || entry.endsWith(".d.ts")) continue;
			files.push(relative(REPO_ROOT, abs).split(sep).join("/"));
		}
	}

	for (const dir of SCAN_DIRS) walk(join(REPO_ROOT, dir));
	return files.filter((f) => !ALLOWLIST.has(f)).sort();
}

/** `path:line — trimmed source` pour chaque ligne qui matche. */
function findOffendingLines(files: string[], pattern: RegExp): string[] {
	const offenders: string[] = [];

	for (const relativePath of files) {
		const lines = readFileSync(join(REPO_ROOT, relativePath), "utf-8").split("\n");
		lines.forEach((line, index) => {
			if (pattern.test(line)) {
				offenders.push(`${relativePath}:${index + 1} — ${line.trim()}`);
			}
		});
	}

	return offenders;
}

describe("@regression no-px-media-query", () => {
	const sourceFiles = collectFiles(/\.tsx?$/);
	const cssFiles = collectFiles(/\.css$/);

	it("scans a meaningful number of files", () => {
		// Sanity check : si le walker casse, les tests suivants passeraient à vide
		// — un garde-fou vert pour la mauvaise raison ne garde rien.
		expect(sourceFiles.length).toBeGreaterThan(500);
		expect(cssFiles.length).toBeGreaterThan(3);
	});

	it("n'utilise aucune largeur en px dans un matchMedia() / useMediaQuery()", () => {
		const offenders = findOffendingLines(
			sourceFiles,
			/(matchMedia|useMediaQuery)\s*\([^)]*\d+\s*px/,
		);

		expect(
			offenders,
			"Seuil de largeur en px dans une media query JS — il se désynchronise des " +
				"breakpoints Tailwind (rem) dès que la police racine change.\n" +
				"Utiliser mediaBelow() / mediaAtLeast() de shared/constants/breakpoints.ts.\n" +
				offenders.join("\n"),
		).toEqual([]);
	});

	// `window.innerWidth < 768` échappait au contrôle ci-dessus (pas un
	// `matchMedia`) et divergeait en plus de `matchMedia` de la largeur de la
	// scrollbar (~15px sur Windows/Linux) : on servait la logique desktop sur la
	// bande 768-783px où le CSS était encore en mise en page mobile.
	it("ne compare jamais window.innerWidth à une largeur en px", () => {
		const offenders = findOffendingLines(
			sourceFiles,
			/\b(?:window\.)?inner(?:Width)\s*[<>]=?\s*\d{3,}/,
		);

		expect(
			offenders,
			"Comparaison de `innerWidth` à un seuil px : diverge du CSS de la largeur de " +
				"scrollbar, et ne suit pas la police racine.\n" +
				'Utiliser `window.matchMedia(mediaBelow("md"))`.\n' +
				offenders.join("\n"),
		).toEqual([]);
	});

	// Un seuil injecté dans un template (`(min-width: ${maxWidth}px)`) n'a pas de
	// littéral numérique et passait sous le radar du premier contrôle — c'était
	// le cas de `useEdgeSwipe`, dont le `maxWidth: number` a été remplacé par un
	// nom de breakpoint.
	it("ne construit pas de media query par interpolation de px", () => {
		const offenders = findOffendingLines(sourceFiles, /\((?:min|max)-width:\s*\$\{[^}]+\}px\)/);

		expect(
			offenders,
			"Media query construite par interpolation avec un suffixe `px` — le seuil " +
				"reste en px quel que soit l'appelant.\n" +
				"Passer un `Breakpoint` et dériver la requête via mediaBelow()/mediaAtLeast().\n" +
				offenders.join("\n"),
		).toEqual([]);
	});

	it("n'utilise aucune largeur en px dans les media queries CSS écrites à la main", () => {
		const offenders = findOffendingLines(
			cssFiles,
			/@media[^{]*\b(?:min-width|max-width|width)\b[^{]*\d+\s*px/,
		);

		expect(
			offenders,
			"Media query CSS avec une largeur en px — exprimer le seuil en rem, aligné " +
				"sur shared/constants/breakpoints.ts.\n" +
				offenders.join("\n"),
		).toEqual([]);
	});

	it("déclare les breakpoints Tailwind (--breakpoint-*) en rem", () => {
		const offenders = findOffendingLines(cssFiles, /--breakpoint-[a-z0-9]+:\s*[\d.]+px/);

		expect(
			offenders,
			"Breakpoint Tailwind déclaré en px : il se désynchroniserait des variants " +
				"standards (eux en rem) dès que la police racine change.\n" +
				offenders.join("\n"),
		).toEqual([]);
	});

	it("garde le seuil mobile JS aligné sur le variant Tailwind md:", () => {
		// 48rem = valeur de `--breakpoint-md` par défaut de Tailwind v4. Si l'un
		// des deux bouge sans l'autre, le bug P1-1 revient.
		expect(BREAKPOINTS.md).toBe(48);
		expect(MOBILE_MEDIA_QUERY).toBe(mediaBelow("md"));
	});
});

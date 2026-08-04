/**
 * @regression smooth-scroll-reduced-motion
 *
 * Un `scrollIntoView({ behavior: "smooth" })` / `scrollTo({ behavior: "smooth" })`
 * ÉCRASE le `scroll-behavior: auto` que globals.css applique sous
 * `prefers-reduced-motion` — chaque call site JS doit donc porter sa propre garde.
 *
 * Audit « Animations & reduced motion » 2026-08-03 : 5 call sites étaient nus,
 * dont le scroll vers l'erreur de PAIEMENT (pay-button) et le scroll-to-active
 * des deux menu-sheets (dont le commentaire promettait à tort de respecter
 * reduced-motion — la garde ne couvrait que le timing).
 *
 * Règle : tout fichier source contenant le littéral `"smooth"` doit aussi
 * contenir un marqueur de garde reduced-motion (matchMedia inline ou hook),
 * ou figurer dans l'allowlist justifiée.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__snapshots__"]);

/**
 * Marqueurs acceptés comme preuve de garde. Granularité fichier : un fichier
 * gardé peut contenir la branche `"smooth"` d'un ternaire
 * (`reduced ? "auto" : "smooth"`).
 */
const GUARD_MARKERS =
	/prefers-reduced-motion|useReducedMotion|shouldReduceMotion|prefersReducedMotion|reducedMotion|reduceMotion/;

const ALLOWLIST = new Map<string, string>([
	[
		"app/layout.tsx",
		'data-scroll-behavior="smooth" : attribut informatif Next — le scroll réel ' +
			"suit le scroll-behavior CSS, gardé par globals.css (scroll-behavior: auto " +
			"sous reduced-motion)",
	],
]);

function collectFiles(): string[] {
	const files: string[] = [];

	function walk(absDir: string) {
		for (const entry of readdirSync(absDir)) {
			if (SKIP_DIRS.has(entry)) continue;
			const abs = join(absDir, entry);
			if (statSync(abs).isDirectory()) {
				walk(abs);
				continue;
			}
			if (!/\.tsx?$/.test(entry)) continue;
			if (/\.(test|spec)\.tsx?$/.test(entry) || entry.endsWith(".d.ts")) continue;
			files.push(relative(REPO_ROOT, abs).split(sep).join("/"));
		}
	}

	for (const dir of SCAN_DIRS) walk(join(REPO_ROOT, dir));
	return files.sort();
}

describe("@regression smooth-scroll-reduced-motion", () => {
	const files = collectFiles();

	it("scans a meaningful number of files", () => {
		expect(files.length).toBeGreaterThan(500);
	});

	it('tout fichier utilisant "smooth" porte une garde reduced-motion', () => {
		const offenders: string[] = [];

		for (const relativePath of files) {
			const content = readFileSync(join(REPO_ROOT, relativePath), "utf-8");
			if (!/["']smooth["']/.test(content)) continue;
			if (ALLOWLIST.has(relativePath)) continue;
			if (GUARD_MARKERS.test(content)) continue;
			offenders.push(relativePath);
		}

		expect(
			offenders,
			'Fichier avec `"smooth"` sans garde reduced-motion — utiliser le pattern ' +
				'`matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"` ' +
				"inline (cf. checkout-stripe-section.tsx), ou justifier une entrée d'allowlist :\n" +
				offenders.join("\n"),
		).toEqual([]);
	});

	it("l'allowlist ne contient pas d'entrées périmées", () => {
		const stale = [...ALLOWLIST.keys()].filter((path) => {
			try {
				const content = readFileSync(join(REPO_ROOT, path), "utf-8");
				return !/["']smooth["']/.test(content);
			} catch {
				return true;
			}
		});
		expect(
			stale,
			'Entrée d\'allowlist sans occurrence de "smooth" — la retirer :\n' + stale.join("\n"),
		).toEqual([]);
	});
});

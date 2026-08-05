/**
 * @regression focus-ring-ssot
 *
 * `@utility focus-ring` est la SEULE façon de peindre un focus dans le dépôt, et
 * `focus-visible:outline-ring` en est la contrefaçon la plus tenace.
 *
 * `--ring` vaut `--primary`, le rose pastel `#fdb8e4` : **1,55:1** sur
 * `--background`, très en dessous des 3:1 exigés par WCAG 1.4.11. `focus-ring` pose
 * un `outline: 2px solid var(--foreground)` (19,54:1) qui porte l'INFORMATION, et ne
 * garde le rose que pour le halo de 5 px, qui porte la MARQUE — la nuance est écrite
 * en tête de `app/globals.css`.
 *
 * Le motif interdit ici a survécu à plusieurs passages parce qu'il *ressemble* à un
 * focus correct : deux pixels d'outline, un offset, un token de couleur. Il était
 * encore sur les trois radiogroups du dialog panier (audit design 2026-08-04, P1),
 * là où le focus EST la navigation.
 *
 * ⚠️ Volontairement **sans allowlist**. Les trois derniers sites hors panier
 * (`carousel.tsx`, `tab-navigation.tsx`, `sortable-color-chips.tsx`) ont été
 * convertis plutôt qu'inscrits : une allowlist aurait légitimé la dette qu'on venait
 * de solder.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..", "..", "..");
const SCAN_DIRS = ["app", "modules", "shared"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__snapshots__"]);

/** Le motif proscrit : l'outline de focus peint en `--ring`. */
const FORBIDDEN = /focus-visible:outline-ring/;

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) continue;

		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			collectSourceFiles(full, acc);
			continue;
		}

		if (!/\.tsx?$/.test(entry)) continue;
		// Les tests CITENT le motif pour l'interdire — celui-ci le premier.
		if (/\.(test|spec)\.tsx?$/.test(entry) || entry.endsWith(".d.ts")) continue;

		acc.push(full);
	}
	return acc;
}

const sourceFiles = SCAN_DIRS.flatMap((dir) => collectSourceFiles(join(ROOT, dir)));

describe("@regression focus-ring-ssot", () => {
	it("scanne bien tout le dépôt", () => {
		expect(sourceFiles.length).toBeGreaterThan(500);
		expect(sourceFiles.some((f) => f.endsWith("shared/components/ui/carousel.tsx"))).toBe(true);
	});

	it("aucun fichier ne peint son focus en `outline-ring`", () => {
		const offenders = sourceFiles
			.filter((file) => FORBIDDEN.test(readFileSync(file, "utf8")))
			.map((file) => file.slice(ROOT.length + 1));

		expect(offenders).toEqual([]);
	});

	it("`@utility focus-ring` existe toujours et porte l'outline en `--foreground`", () => {
		const globals = readFileSync(join(ROOT, "app", "globals.css"), "utf8");
		const utility = globals.match(/@utility\s+focus-ring\s*\{([\s\S]*?)\n\}/);

		expect(utility).not.toBeNull();
		expect(utility![1]).toMatch(/outline:\s*2px\s+solid\s+var\(--foreground\)/);
	});
});

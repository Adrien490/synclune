/**
 * @regression phosphor-ssr-entry
 *
 * Toute icône Phosphor s'importe depuis `@phosphor-icons/react/ssr`, jamais
 * depuis la racine du paquet.
 *
 * ## Pourquoi (migration lucide → Phosphor, 2026-08-04)
 *
 * `dist/index.es.js` — la racine — commence par `import * as … from "./ssr/index.es.js"`
 * PUIS enchaîne ~1512 `import … from "./csr/<Icon>.es.js"`. Un seul import depuis la
 * racine met donc les deux arbres entiers (~9000 modules) dans le graphe du bundler.
 * C'est le problème de temps de compilation que le README de Phosphor décrit, et
 * `optimizePackageImports` ne le rattrape que s'il est configuré sur la bonne entrée.
 *
 * Second motif, plus sournois : les composants `dist/csr/*` s'appuient sur `IconBase`,
 * qui lit `IconContext` via `useContext`. Ils ne portent PAS de directive `"use client"`
 * — donc un import racine dans un Server Component ne casse pas à l'analyse, il casse
 * au rendu. Les variantes `dist/ssr/*` passent par `SSRBase`, sans contexte : elles
 * fonctionnent indifféremment en Server et en Client Component.
 *
 * ## Les règles
 *
 * 1. Les imports de VALEUR viennent de `@phosphor-icons/react/ssr` (ou d'un
 *    sous-chemin `@phosphor-icons/react/ssr/<Icon>`).
 * 2. Seuls les imports de TYPE peuvent viser la racine : `dist/ssr/index.d.ts` ne
 *    ré-exporte pas `Icon` / `IconProps` / `IconWeight`. Un `import type` est effacé
 *    au build, donc sans coût runtime.
 * 3. Un `vi.mock()` doit cibler `@phosphor-icons/react/ssr` : mocker la racine ne
 *    remplace pas le module réellement importé par le composant sous test — le mock
 *    est inerte et le test passe (ou échoue) pour la mauvaise raison.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__snapshots__"]);

const SSR_ENTRY = "@phosphor-icons/react/ssr";
const ROOT_ENTRY = "@phosphor-icons/react";

/** Toute déclaration d'import dont le specifier commence par `@phosphor-icons/react`. */
const PHOSPHOR_IMPORT = /import\s+(type\s+)?[^;]*?from\s*["'](@phosphor-icons\/react[^"']*)["']/gs;

function collectFiles(options: { tests: boolean }): string[] {
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
			const isTest = /\.(test|spec)\.tsx?$/.test(entry);
			if (isTest !== options.tests) continue;
			files.push(relative(REPO_ROOT, abs).split(sep).join("/"));
		}
	}

	for (const dir of SCAN_DIRS) walk(join(REPO_ROOT, dir));
	return files.sort();
}

describe("@regression phosphor-ssr-entry", () => {
	const sourceFiles = collectFiles({ tests: false });
	const testFiles = collectFiles({ tests: true });

	it("scans a meaningful number of files", () => {
		expect(sourceFiles.length).toBeGreaterThan(500);
		expect(testFiles.length).toBeGreaterThan(200);
	});

	it("les imports de valeur passent par l'entrée /ssr", () => {
		const offenders: string[] = [];

		for (const relativePath of sourceFiles) {
			const content = readFileSync(join(REPO_ROOT, relativePath), "utf-8");
			for (const match of content.matchAll(PHOSPHOR_IMPORT)) {
				const isTypeOnly = Boolean(match[1]);
				const specifier = match[2] ?? "";

				if (specifier === SSR_ENTRY || specifier.startsWith(`${SSR_ENTRY}/`)) continue;
				if (isTypeOnly && specifier === ROOT_ENTRY) continue;

				offenders.push(
					`${relativePath} — ${isTypeOnly ? "import type" : "import"} … from "${specifier}"`,
				);
			}
		}

		expect(
			offenders,
			`Import Phosphor hors de l'entrée "${SSR_ENTRY}".\n` +
				"La racine du paquet tire ~9000 modules (CSR + SSR) dans le graphe, et ses\n" +
				"composants CSR lisent IconContext — ils cassent au RENDU en Server Component.\n" +
				`Seuls les \`import type\` peuvent viser "${ROOT_ENTRY}" (Icon / IconProps / IconWeight).\n` +
				offenders.join("\n"),
		).toEqual([]);
	});

	it("les vi.mock ciblent l'entrée /ssr", () => {
		const offenders: string[] = [];

		for (const relativePath of testFiles) {
			const lines = readFileSync(join(REPO_ROOT, relativePath), "utf-8").split("\n");
			lines.forEach((line, index) => {
				if (/vi\.mock\(\s*["']@phosphor-icons\/react["']/.test(line)) {
					offenders.push(`${relativePath}:${index + 1}`);
				}
			});
		}

		expect(
			offenders,
			`vi.mock() sur la racine du paquet — le composant sous test importe "${SSR_ENTRY}",\n` +
				"donc ce mock ne remplace rien et le test passe pour la mauvaise raison.\n" +
				offenders.join("\n"),
		).toEqual([]);
	});

	it("plus aucune référence à lucide-react", () => {
		const offenders: string[] = [];

		for (const relativePath of [...sourceFiles, ...testFiles]) {
			const content = readFileSync(join(REPO_ROOT, relativePath), "utf-8");
			if (/["']lucide-react["']/.test(content)) offenders.push(relativePath);
		}

		expect(
			offenders,
			"`lucide-react` a été retiré des dépendances (migration Phosphor 2026-08-04).\n" +
				offenders.join("\n"),
		).toEqual([]);
	});
});

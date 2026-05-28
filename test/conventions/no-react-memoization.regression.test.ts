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
 * Périmètre : `shared/components`, `shared/hooks`, `modules/* /components`,
 * `modules/* /hooks`, `app/**`. Tests et __mocks__ exclus.
 */

const REPO_ROOT = process.cwd();

const SCAN_ROOTS = [
	join(REPO_ROOT, "shared", "components"),
	join(REPO_ROOT, "shared", "hooks"),
	join(REPO_ROOT, "modules"),
	join(REPO_ROOT, "app"),
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
const FORBIDDEN_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
	{ name: "useMemo", pattern: /\buseMemo\s*\(/ },
	{ name: "useCallback", pattern: /\buseCallback\s*\(/ },
	{ name: "React.memo", pattern: /\bReact\.memo\s*\(/ },
	{ name: "memo() import", pattern: /from\s+["']react["'][^;]*\bmemo\b/ },
];

describe("React 19 — pas de mémoisation manuelle", () => {
	const allFiles = SCAN_ROOTS.flatMap((root) => walk(root));

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

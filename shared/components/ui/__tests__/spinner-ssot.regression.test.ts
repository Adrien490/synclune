/**
 * @regression spinner-ssot
 *
 * `shared/components/ui/spinner.tsx` est la SSOT du spinner de chargement.
 *
 * ## Le constat que ce test verrouille (audit UI design system 2026-08-01)
 *
 * Avant remédiation, 5 implémentations coexistaient : la primitive `Spinner`
 * (2 consommateurs), ~25 sites instanciant `LoaderCircle` en direct, ~12 sites
 * instanciant `Loader2` (deux icônes différentes pour le même rôle),
 * `MiniDotsLoader` et 2 SVG maison. Sur ces sites inline, 42 occurrences
 * d'`animate-spin` n'étaient PAS gatées `motion-safe:` — la rotation tournait
 * sous `prefers-reduced-motion` (WCAG 2.3.3).
 *
 * ## Les règles
 *
 * 1. Aucun import d'une icône de chargement Phosphor (`SpinnerIcon`,
 *    `SpinnerGapIcon`, `SpinnerBallIcon`, `CircleNotchIcon`) hors de la primitive
 *    — utiliser `<Spinner />` (ou `<Spinner presentational />` dans un élément
 *    déjà `aria-busy`). Les noms lucide historiques (`Loader2`, `LoaderCircle`)
 *    restent interdits : leur réapparition signalerait un retour en arrière.
 *
 *    ⚠️ Phosphor rend une icône PLEINE (`fill="currentColor"`), pas un tracé :
 *    l'illusion de rotation vient de `animate-spin`, jamais d'un `strokeWidth`.
 * 2. Tout `animate-spin` restant (icône métier qu'on fait tourner, ex.
 *    `RefreshCw`) est gaté `motion-safe:`.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");

const SCAN_DIRS = ["app", "modules", "shared"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__snapshots__"]);

/** Fichiers autorisés à importer l'icône de chargement brute. */
const LOADER_IMPORT_ALLOWLIST = new Set<string>([
	// La primitive elle-même.
	"shared/components/ui/spinner.tsx",
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

describe("@regression spinner-ssot", () => {
	const files = collectFiles();

	it("scans a meaningful number of files", () => {
		expect(files.length).toBeGreaterThan(500);
	});

	it("aucun import lucide Loader2/LoaderCircle hors de la primitive Spinner", () => {
		const offenders: string[] = [];

		for (const relativePath of files) {
			if (LOADER_IMPORT_ALLOWLIST.has(relativePath)) continue;
			const content = readFileSync(join(REPO_ROOT, relativePath), "utf-8");
			if (
				/import\s[^;]*\b(SpinnerIcon|SpinnerGapIcon|SpinnerBallIcon|CircleNotchIcon|Loader2Icon|LoaderCircle|Loader2)\b[^;]*from\s+["'](@phosphor-icons\/react\/ssr|lucide-react)["']/s.test(
					content,
				)
			) {
				offenders.push(relativePath);
			}
		}

		expect(
			offenders,
			"Icône de chargement importée en direct — utiliser <Spinner /> " +
				"(shared/components/ui/spinner.tsx), ou <Spinner presentational /> dans " +
				"un élément déjà aria-busy.\n" +
				offenders.join("\n"),
		).toEqual([]);
	});

	it("tout animate-spin est gaté motion-safe:", () => {
		const offenders: string[] = [];

		for (const relativePath of files) {
			const lines = readFileSync(join(REPO_ROOT, relativePath), "utf-8").split("\n");
			lines.forEach((line, index) => {
				if (/(?<!motion-safe:)\banimate-spin\b/.test(line)) {
					offenders.push(`${relativePath}:${index + 1} — ${line.trim().slice(0, 120)}`);
				}
			});
		}

		expect(
			offenders,
			"`animate-spin` sans `motion-safe:` — la rotation tourne sous " +
				"prefers-reduced-motion. Gater, ou passer par <Spinner />.\n" +
				offenders.join("\n"),
		).toEqual([]);
	});
});

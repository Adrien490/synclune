/**
 * @regression semantic-tokens-ssot
 *
 * Les états sémantiques (succès, avertissement, info, erreur) passent par les
 * tokens du thème — `success` / `warning` / `info` / `destructive` (+ leurs
 * `-foreground`, définis dans `app/globals.css`) — jamais par la palette
 * Tailwind brute (`emerald-600`, `amber-100`, `green-800`…).
 *
 * ## Le constat que ce test verrouille (audit UI design system 2026-08-01)
 *
 * ~240 occurrences contournaient les tokens : `mini-dots-loader` mappait
 * littéralement `success: "bg-emerald-600"` ; le toast warning était bordé
 * avec `--secondary` ; la timeline commande utilisait 17 couleurs brutes —
 * `PAID` s'affichait en `text-green-500` à côté d'un badge `variant="success"`
 * (deux verts différents co-visibles sur le même écran). Retinter la marque ou
 * ajuster un contraste devient impossible quand la couleur est éclatée.
 *
 * ## La règle
 *
 * Dans `shared/` (composants, constantes, utils), aucune classe de couleur de
 * la palette Tailwind numérotée. Périmètre volontairement limité à `shared/` :
 * un scan `modules/`/`app/` hurlerait sur le décoratif (landing, atelier) et
 * serait désactivé en une semaine — même logique que `hover-focus-parity`.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const SHARED_ROOT = join(__dirname, "..", "..");

const SCAN_DIRS = ["components", "constants", "utils"] as const;
const SKIP_DIRS = new Set(["node_modules", "__snapshots__"]);

/**
 * Fichiers autorisés à porter une couleur de palette brute. Toute addition
 * doit être justifiée en commentaire.
 */
const ALLOWLIST = new Set<string>([
	// Washi tape décoratif des polaroids (pink/lavender/mint/peach) : palette
	// ornementale sans sémantique d'état — aucun token à substituer.
	"components/polaroid-frame.tsx",
]);

const RAW_PALETTE =
	/(?:^|[\s"'`:])(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|divide|shadow|accent|caret)-(?:emerald|amber|green|red|orange|yellow|lime|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|gray|slate|zinc|neutral|stone)-[0-9]{2,3}\b/;

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
			files.push(relative(SHARED_ROOT, abs).split(sep).join("/"));
		}
	}

	for (const dir of SCAN_DIRS) walk(join(SHARED_ROOT, dir));
	return files.filter((f) => !ALLOWLIST.has(f)).sort();
}

describe("@regression semantic-tokens-ssot", () => {
	const files = collectFiles();

	it("scans a meaningful number of files", () => {
		expect(files.length).toBeGreaterThan(200);
	});

	it("détecte une couleur brute (preuve que le garde attrape le bug)", () => {
		expect(RAW_PALETTE.test('className="bg-emerald-600 text-white"')).toBe(true);
		expect(RAW_PALETTE.test('success: "bg-emerald-600",')).toBe(true);
		expect(RAW_PALETTE.test("text-amber-700")).toBe(true);
		// Tokens sémantiques : légitimes.
		expect(RAW_PALETTE.test('className="bg-success text-success-foreground"')).toBe(false);
		expect(RAW_PALETTE.test('className="bg-warning/10 border-warning/30"')).toBe(false);
	});

	it("aucune couleur de palette brute dans shared/", () => {
		const offenders: string[] = [];

		for (const relativePath of files) {
			const lines = readFileSync(join(SHARED_ROOT, relativePath), "utf-8").split("\n");
			lines.forEach((line, index) => {
				if (RAW_PALETTE.test(line)) {
					offenders.push(`shared/${relativePath}:${index + 1} — ${line.trim().slice(0, 120)}`);
				}
			});
		}

		expect(
			offenders,
			"Couleur de palette Tailwind brute pour un état sémantique — utiliser les " +
				"tokens `success` / `warning` / `info` / `destructive` (app/globals.css).\n" +
				offenders.join("\n"),
		).toEqual([]);
	});
});

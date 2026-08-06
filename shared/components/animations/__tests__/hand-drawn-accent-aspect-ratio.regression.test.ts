/**
 * @regression hand-drawn-accent-aspect-ratio
 *
 * `HandDrawnAccent` rend `<svg width height viewBox>` sans `preserveAspectRatio`
 * — le défaut SVG `xMidYMid meet` s'applique donc : un couple width×height dont
 * le ratio dévie de celui du viewBox RÉTRÉCIT et DÉCALE le tracé en silence.
 * Payé sur SEPT appelants (audits collection-chapter puis HandDrawnAccent,
 * 2026-08-05) : sous « — Léane » (footer, toutes les pages), 69,6 px d'encre
 * rendus pour 92 demandés, décalés de 11,2 px ; dans le sélecteur de variante,
 * 54 px pour 130 (échelle 0,45). Ni tsc, ni un test, ni l'œil ne le voyaient.
 *
 * Le correctif est structurel : la prop `height` n'existe plus, la hauteur est
 * DÉRIVÉE du ratio natif du tracé. Ce test verrouille les deux moitiés :
 * a) chaque tracé de la SSOT déclare des width/height natifs au ratio EXACT de
 *    son viewBox (sinon la dérivation elle-même letterboxerait) ;
 * b) aucun call site JSX ne passe `height=` à HandDrawnAccent/HandDrawnUnderline
 *    — le jour où la prop serait ré-introduite, le scan casse avant la prod.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

import {
	ACCENT_SHAPE_PATHS,
	ATELIER_THREAD_PATHS,
	UNDERLINE_PATHS,
} from "@/shared/components/hand-drawn/paths";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const SCAN_ROOTS = ["app", "modules", "shared"] as const;
const IGNORED_SEGMENTS = new Set(["node_modules", ".next", "__tests__"]);

function collectTsxFiles(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (!IGNORED_SEGMENTS.has(entry)) collectTsxFiles(full, out);
		} else if (entry.endsWith(".tsx") && !entry.includes(".test.")) {
			out.push(full);
		}
	}
	return out;
}

describe("SSOT des tracés — ratio natif exact", () => {
	const entries = [
		...Object.entries(UNDERLINE_PATHS).map(([key, cfg]) => [`underline/${key}`, cfg] as const),
		...Object.entries(ACCENT_SHAPE_PATHS),
		...Object.entries(ATELIER_THREAD_PATHS).map(([key, cfg]) => [`atelier/${key}`, cfg] as const),
	];

	it.each(entries)("%s : width/height natifs === ratio du viewBox", (_name, cfg) => {
		const [, , vbWidth, vbHeight] = cfg.viewBox.split(" ").map(Number);
		expect(vbWidth).toBeGreaterThan(0);
		expect(vbHeight).toBeGreaterThan(0);
		expect(cfg.width / cfg.height).toBeCloseTo(vbWidth! / vbHeight!, 10);
		// Le natif EST le viewBox : échelle 1, encre pleine boîte.
		expect(cfg.width).toBe(vbWidth);
		expect(cfg.height).toBe(vbHeight);
	});
});

describe("call sites — plus jamais de height sur un accent", () => {
	const files = SCAN_ROOTS.flatMap((root) => collectTsxFiles(join(REPO_ROOT, root)));
	const offenders: string[] = [];

	for (const file of files) {
		const content = readFileSync(file, "utf8");
		if (!content.includes("<HandDrawn")) continue;
		for (const match of content.matchAll(/<HandDrawn(?:Accent|Underline)\b[\s\S]*?\/>/g)) {
			if (/\bheight=/.test(match[0])) {
				offenders.push(relative(REPO_ROOT, file).split(sep).join("/"));
			}
		}
	}

	it("aucun call site ne passe height= (la hauteur est dérivée du tracé)", () => {
		expect(offenders).toEqual([]);
	});

	it("le scan voit bien les call sites (sinon il protège dans le vide)", () => {
		const withAccent = files.filter((file) => readFileSync(file, "utf8").includes("<HandDrawn"));
		// Footer, méga-menus, galerie, dialog de variante, 404, admin, /paiement…
		expect(withAccent.length).toBeGreaterThanOrEqual(6);
	});
});

/**
 * @regression focus-ring-ssot
 *
 * L'utility `focus-ring` (`app/globals.css`) est la SSOT de l'anneau de focus
 * (WCAG 2.4.7) : `focus-visible:border-ring focus-visible:ring-ring
 * outline-none focus-visible:ring-[3px]`.
 *
 * ## Le constat que ce test verrouille (audit UI design system 2026-08-01)
 *
 * Avant remédiation, 4 systèmes concurrents coexistaient dans le repo :
 * l'utility (16 sites), `focus-visible:ring-[3px]` réécrit à la main (10),
 * `focus-visible:ring-2` ± offset (41) et l'outline global — avec 12 couleurs
 * d'anneau différentes. Deux champs côte à côte n'avaient pas le même halo.
 *
 * ## La règle
 *
 * Dans `shared/components/ui/`, aucune LARGEUR d'anneau de focus réécrite à la
 * main (`focus-visible:ring-1|2|4|[…]`) : passer par `focus-ring`. Les
 * overrides de COULEUR (`focus-visible:ring-destructive/20`) restent permis —
 * ils composent avec l'utility au lieu de la réimplémenter.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const UI_DIR = join(__dirname, "..");

/**
 * Fichiers autorisés à porter une largeur d'anneau manuelle. Toute addition
 * doit être justifiée en commentaire.
 */
const ALLOWLIST = new Set<string>([
	// Sous-système à tokens dédiés (`--sidebar-ring`) : l'anneau est
	// `ring-sidebar-ring focus-visible:ring-2`, thémé par la sidebar elle-même.
	"sidebar.tsx",
	// Pouce du slider : halo `ring-4` symétrique hover/focus (`hover:ring-4` +
	// `focus-visible:ring-4` sur le même `ring-ring/50`) — parité d'affordance
	// volontaire, la remplacer par focus-ring désynchroniserait les deux états.
	"slider.tsx",
]);

describe("@regression focus-ring-ssot", () => {
	const files = readdirSync(UI_DIR)
		.filter((f) => f.endsWith(".tsx") && !ALLOWLIST.has(f))
		.sort();

	it("scans a meaningful number of files", () => {
		expect(files.length).toBeGreaterThan(40);
	});

	it("aucune largeur d'anneau de focus manuelle dans shared/components/ui/", () => {
		const offenders: string[] = [];
		const manualRingWidth = /focus-visible:ring-(?:1|2|4|\[)/;

		for (const file of files) {
			const lines = readFileSync(join(UI_DIR, file), "utf-8").split("\n");
			lines.forEach((line, index) => {
				if (manualRingWidth.test(line)) {
					offenders.push(`${file}:${index + 1} — ${line.trim().slice(0, 120)}`);
				}
			});
		}

		expect(
			offenders,
			"Largeur d'anneau de focus réécrite à la main — utiliser l'utility " +
				"`focus-ring` (SSOT, app/globals.css). Un override de couleur seule " +
				"(`focus-visible:ring-destructive/20`) reste permis.\n" +
				offenders.join("\n"),
		).toEqual([]);
	});

	it("les primitives interactives passent par focus-ring", () => {
		// Échantillon représentatif : si l'un régresse vers un anneau inline,
		// le test précédent le voit ; celui-ci garde le chemin nominal.
		for (const file of [
			"button.tsx",
			"input.tsx",
			"checkbox.tsx",
			"radio-group.tsx",
			"select.tsx",
			"textarea.tsx",
			"badge.tsx",
			"switch.tsx",
			"tabs.tsx",
		]) {
			const content = readFileSync(join(UI_DIR, file), "utf-8");
			expect(content.includes("focus-ring"), `${file} doit utiliser focus-ring`).toBe(true);
		}
	});
});

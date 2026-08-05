/**
 * @regression qs-focus-and-hover-gating
 *
 * Deux défauts d'accessibilité visuelle cohabitaient dans ce dossier, tous deux
 * invisibles à `tsc`, à eslint et à jsdom (aucune feuille de style) :
 *
 * **1. Trois contrôles n'avaient que l'anneau PASTEL comme indicateur de focus.**
 * `focus-visible:ring-ring … focus-visible:outline-none` au lieu de `focus-ring`.
 * Or `globals.css` § ROSE PROFOND est explicite : `--ring` reste pastel À DESSEIN
 * (≈1,6:1) et l'information est portée par l'`outline: 2px solid var(--foreground)`
 * (19,5:1) de `@utility focus-ring` — que ces call sites ÉTEIGNAIENT. Indicateur
 * de focus sous les 3:1 exigés par WCAG 1.4.11. Le × de suppression d'une
 * recherche récente, « Voir toutes les collections » et la suggestion
 * orthographique étaient concernés ; tout le reste du dossier utilisait déjà
 * `focus-ring`.
 *
 * **2. Le × de suppression était masqué sur le mauvais AXE.**
 * `md:opacity-0 md:group-hover/item:opacity-100` : `md:` est une largeur, pas une
 * capacité de survol. Un iPad (≥ 768 px, `hover: none`) tombait dans le masquage
 * sans jamais pouvoir déclencher la révélation — bouton à `opacity: 0`, toujours
 * cliquable et focusable. C'est l'erreur consignée dans CLAUDE.md § Conventions UI
 * (« gater le MASQUAGE, pas la révélation »), déjà rencontrée sur `ProductCard`
 * le 2026-08-03. Le bon gate est `can-hover:`.
 *
 * Audit UI/UX 2026-08-05 (P2-3, P2-5).
 *
 * ⚠️ **Le scan STRIPPE les commentaires avant de chercher.** Les correctifs sont
 * documentés au call site et CITENT les motifs interdits ; sans ce nettoyage le
 * test rougirait sur sa propre documentation (piège rencontré deux fois dans ce
 * dépôt).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const DIALOG_DIR = join(__dirname, "..");

/** Retire commentaires de bloc, de ligne et blocs JSX `{/* … *​/}`. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function sourceFiles(): { file: string; code: string }[] {
	return readdirSync(DIALOG_DIR)
		.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
		.sort()
		.map((file) => ({
			file,
			code: stripComments(readFileSync(join(DIALOG_DIR, file), "utf8")),
		}));
}

describe("recherche rapide — focus et masquage au survol", () => {
	it("n'éteint jamais l'outline de focus (`focus-visible:outline-none`)", () => {
		const offenders = sourceFiles()
			.filter(({ code }) => code.includes("focus-visible:outline-none"))
			.map(({ file }) => file);

		expect(
			offenders,
			"`--ring` est pastel à dessein (≈1,6:1) : c'est l'outline `--foreground` de " +
				"`@utility focus-ring` qui porte l'état, à 19,5:1. L'éteindre laisse le pastel " +
				"seul indicateur, sous les 3:1 de WCAG 1.4.11. Utiliser `focus-ring`.",
		).toEqual([]);
	});

	it("ne pose jamais `ring-ring` comme unique anneau de focus", () => {
		const offenders = sourceFiles()
			.filter(({ code }) => /focus-visible:ring-ring/.test(code))
			.map(({ file }) => file);

		expect(offenders, "Même raison : passer par `focus-ring`, jamais par `--ring` nu.").toEqual([]);
	});

	it("ne masque jamais une affordance derrière un BREAKPOINT de largeur", () => {
		const offenders = sourceFiles()
			.filter(({ code }) => /\b(sm|md|lg|xl):opacity-0\b/.test(code))
			.map(({ file }) => file);

		expect(
			offenders,
			"Une largeur ne dit rien de la capacité de survol : un iPad (≥ md, `hover: none`) " +
				"resterait masqué sans jamais pouvoir se révéler, tout en restant cliquable. " +
				"Gater sur `can-hover:` (cf. `sortable-media-item.tsx`).",
		).toEqual([]);
	});

	it("le × de suppression est visible par défaut, masqué seulement là où le survol existe", () => {
		const code = sourceFiles().find(({ file }) => file === "idle-content.tsx")!.code;

		expect(code).toContain("can-hover:opacity-0");
		expect(code).toContain("can-hover:group-hover/item:opacity-100");
		// Hors `can-hover`, rien ne masque : le bouton est simplement visible.
		expect(code).toContain('"opacity-100"');
	});

	it("n'emploie aucune taille de police en px (WCAG 1.4.4)", () => {
		const offenders = sourceFiles()
			.filter(({ code }) => /text-\[\d+px\]/.test(code))
			.map(({ file }) => file);

		expect(
			offenders,
			"Une taille en px ne suit pas le réglage de police du navigateur. " +
				"Les jetons `text-2xs` … `text-base` sont en rem.",
		).toEqual([]);
	});
});

/**
 * @regression atelier-thread-continuity
 *
 * Le fil de la section atelier n'était un fil que sur une fraction de son axe.
 * Mesuré au navigateur le 2026-08-06 (Chromium, `reducedMotion: reduce` pour un
 * état stabilisé — les timelines `view()` faussent toute géométrie prise en
 * cours d'animation) :
 *
 * | viewport | encre sur l'axe | plus grand trou |
 * | -------- | --------------- | --------------- |
 * | 390 px   | **44 %**        | **130 px**      |
 * | 1280 px  | **55 %**        | **84 px**       |
 *
 * La cause était structurelle : cinq `<svg>` de segments logés dans les gaps
 * FIXES de 52 px de l'`<ol>`, donc **aucune encre le long des notes** — et une
 * note mesure 121 px à 1280, 185 px à 390. Le fil se dégradait donc en
 * rétrécissant le viewport, exactement là où la métaphore doit tenir, et le
 * plus grand trou tombait entre la dernière perle et le nœud : le payoff était
 * orphelin.
 *
 * Le correctif est un RAIL TUILÉ (`AtelierThreadRail` + `app/styles/atelier-thread.css`),
 * et ce test verrouille les trois propriétés dont dépend sa continuité. Aucune
 * n'est mesurable en jsdom (pas de layout) : elles sont toutes assertées sur la
 * STRUCTURE, ce qui est précisément l'intérêt — c'est la structure qui a
 * changé, pas un réglage.
 */

import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

import { ATELIER_THREAD_PATHS } from "@/shared/components/hand-drawn/paths";

import { AtelierSection } from "../atelier-section";

afterEach(cleanup);

describe("le fil ne peut plus être une suite de segments", () => {
	it("un seul élément de fil, et il couvre la colonne entière", () => {
		const { container } = render(<AtelierSection />);

		const rails = container.querySelectorAll(".atelier-thread-rail");
		expect(rails).toHaveLength(1);

		// Le conteneur positionné du rail contient l'<ol> ET le h3 : le fil part
		// donc au-dessus du titre de liste et court jusqu'au bas de la dernière
		// note, sans qu'aucune hauteur de contenu n'entre dans son montage.
		const holder = rails[0]!.parentElement!;
		expect(holder.querySelector("ol")).not.toBeNull();
		expect(holder.querySelector("h3")).not.toBeNull();
	});

	it("la SSOT n'expose plus de tracé de SEGMENT", () => {
		// `segmentA`/`segmentB` étaient les deux formes logées dans les gaps.
		// Leur simple existence rouvrirait la porte au montage par gap.
		expect(Object.keys(ATELIER_THREAD_PATHS)).not.toContain("segmentA");
		expect(Object.keys(ATELIER_THREAD_PATHS)).not.toContain("segmentB");
		expect(ATELIER_THREAD_PATHS.tile).toBeDefined();
	});

	it("la section ne repose plus sur une constante de position MESURÉE", () => {
		// Le point de couture de la source était un clip `top-20`, calé à la main
		// sur la pile « mt-3 → h3 D'UNE SEULE LIGNE → mt-5 → top-4 » : une
		// retouche de copie qui faisait passer le h3 sur deux lignes décrochait
		// le fil, en silence. Le rail n'a plus de cran de ce genre — seul
		// subsiste `-bottom-4`, qui dépend du TRACÉ du nœud, pas du contenu.
		const source = readFileSync(join(__dirname, "..", "atelier-section.tsx"), "utf8");
		// Scanné dans les `className` seulement : le JSDoc, lui, DOIT continuer à
		// nommer le cran supprimé — c'est ce qui explique pourquoi il ne revient pas.
		const classNames = [...source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/gu)]
			.map((m) => m[1] ?? m[2] ?? "")
			.join(" ");
		expect(classNames).not.toMatch(/\btop-20\b/u);
		expect(source).not.toMatch(/\bsegment[AB]\b/u);
	});
});

describe("la tuile se répète SANS trou", () => {
	// C'est la propriété qui remplace « le segment fait pile la hauteur du gap ».
	// Les anciens segments partaient de `y 2` et mouraient à `y 94` dans un
	// viewBox de 96 : empilés, ils auraient laissé 4 unités de vide à CHAQUE
	// répétition — des tirets, pas un fil.
	const { d, viewBox, height } = ATELIER_THREAD_PATHS.tile;

	it("part du bord haut et finit au bord bas, à la même abscisse", () => {
		const start = /^M\s*(-?[\d.]+)\s+(-?[\d.]+)/u.exec(d);
		expect(start).not.toBeNull();
		const [, startX, startY] = start!.map(Number) as [number, number, number];

		// Dernier couple de coordonnées du `d` — le point d'arrivée.
		const numbers = d.match(/-?[\d.]+/gu)!.map(Number);
		const endY = numbers.at(-1)!;
		const endX = numbers.at(-2)!;

		expect(startY).toBe(0);
		expect(endY).toBe(height);
		// Même abscisse aux deux bouts : deux tuiles se raboutent pile.
		expect(endX).toBe(startX);
	});

	it("déclare une hauteur qui est un multiple entier de la période d'ondulation", () => {
		const [, , vbWidth, vbHeight] = viewBox.split(" ").map(Number);
		expect(vbWidth).toBe(ATELIER_THREAD_PATHS.tile.width);
		expect(vbHeight).toBe(height);
		// 192 = 2 × 96, la hauteur d'un ancien segment : l'alternance des deux
		// formes survit comme les deux demi-périodes d'un même tracé.
		expect(height % 96).toBe(0);
	});
});

describe("les replis du fil valent ceux des tracés", () => {
	it("le rail s'efface en contraste renforcé et en couleurs forcées", () => {
		const { container } = render(<AtelierSection />);

		// Parité avec `AtelierThreadStroke` : l'ornement s'efface, l'encre du
		// texte suffit. Un rail qui survivrait en `forced-colors` peindrait une
		// barre système en travers de la colonne.
		const rail = container.querySelector(".atelier-thread-rail")!;
		expect(rail.className).toContain("contrast-more:hidden");
		expect(rail.className).toContain("forced-colors:hidden");
	});

	it("le rail porte sa tuile ET la hauteur de répétition", () => {
		const { container } = render(<AtelierSection />);

		const rail = container.querySelector(".atelier-thread-rail") as HTMLElement;
		// Un masque sans source ne masque RIEN de visible : le fil disparaîtrait
		// sans une ligne de console. La hauteur, elle, est dérivée du ratio du
		// tracé — la fournir de travers letterboxerait la tuile.
		expect(rail.style.getPropertyValue("--atelier-thread-tile")).toContain("data:image/svg+xml");
		expect(rail.style.getPropertyValue("--atelier-thread-tile-height")).toMatch(/^\d+(\.\d+)?px$/u);
	});
});

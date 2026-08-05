/**
 * @regression display-italic-family
 *
 * L'italique display est chargée par un SECOND loader, non préchargé — et sous la
 * MÊME famille que la romaine.
 *
 * ## Pourquoi ce test existe
 *
 * Le loader de la display déclarait `style: ["normal", "italic"]`. Or `preload` est
 * une option DU LOADER, pas du style : les DEUX woff2 étaient donc émis en
 * préchargé, 37 648 o (romaine) + 40 572 o (italique) = **78 220 o sur le chemin
 * critique de toutes les routes** — vérifiable au marqueur `.p.` des fichiers de
 * `.next/static/media`.
 *
 * Or aucun écran ne peint un glyphe d'italique display au chargement : les six
 * usages sont cinq sous-titres de méga-menu (popups desktop, à l'ouverture) et un
 * heading admin. C'était 52 % du budget police préchargé pour zéro glyphe, en
 * concurrence directe avec le `h1` sous `lg` et avec la photo LCP au-delà, sur un
 * chemin que `fonts.ts` qualifie lui-même de « network-byte-bound, LCP mobile
 * 7–12 s ». Audit du premier écran, 2026-08-05.
 *
 * ## L'invariant à garder, et l'hypothèse qui s'est révélée FAUSSE
 *
 * La première version de ce correctif partait du principe que « next/font hache un
 * nom de famille par appel », et créait donc une variable `--font-display-italic`
 * + une utility Tailwind, avec les six usages routés dessus. Le CSS bâti a démenti :
 * les deux appels émettent `font-family: Winky Sans`, distingués par leur seul
 * `font-style`. Les deux faces cohabitent sous une famille unique, `italic` sur
 * `font-display` sélectionne la vraie italique, et la variable dédiée aurait eu une
 * valeur EXACTEMENT identique à `--font-display` — une distinction imaginaire.
 *
 * Ce partage de famille est ce qui rend le montage sûr, donc c'est LUI qu'on garde :
 * si un jour next/font hachait un nom par appel (ou si quelqu'un pointait le second
 * loader sur une autre famille), les six usages retomberaient **silencieusement** en
 * faux-oblique synthétisé — la « vraie italique » pour laquelle Winky Sans a été
 * choisie, perdue sans un mot.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../..");
/**
 * ⚠️ Commentaires RETIRÉS avant tout scan. `fonts.ts` cite l'ancienne valeur
 * (`style: ["normal", "italic"]`) pour expliquer pourquoi elle est partie : sans ce
 * nettoyage, le test rougit sur la documentation du correctif qu'il garde. Le
 * nettoyage préserve les retours à la ligne — on ne rapporte pas de numéro de
 * ligne ici, mais un décalage rendrait tout message d'échec trompeur.
 */
const FONTS_SOURCE = readFileSync(join(ROOT, "shared/styles/fonts.ts"), "utf8").replace(
	/\/\/[^\n]*/g,
	"",
);

const romanBlock = FONTS_SOURCE.slice(
	FONTS_SOURCE.indexOf("export const winkySans "),
	FONTS_SOURCE.indexOf("export const winkySansItalic"),
);
const italicBlock = FONTS_SOURCE.slice(
	FONTS_SOURCE.indexOf("export const winkySansItalic"),
	FONTS_SOURCE.indexOf("export const onest"),
);

/** La famille Google appelée : `export const x = <Family>({ … })`. */
const googleFamily = (block: string) => /=\s*(\w+)\(\{/.exec(block)?.[1];

describe("@regression display-italic-family", () => {
	it("le découpage des deux blocs a bien fonctionné (garde-fou du garde-fou)", () => {
		expect(romanBlock).not.toBe("");
		expect(italicBlock).not.toBe("");
		expect(italicBlock).not.toContain("export const onest");
	});

	it("la romaine ne déclare QUE le style normal", () => {
		expect(romanBlock).toMatch(/style:\s*\["normal"\]/);
		expect(
			romanBlock,
			'`style: ["normal", "italic"]` fait précharger les DEUX woff2 (78 220 o) ' +
				"alors qu'aucun écran ne peint d'italique display au premier paint.",
		).not.toMatch(/style:\s*\[[^\]]*italic/);
	});

	it("l'italique existe dans un loader NON préchargé", () => {
		expect(italicBlock).toMatch(/style:\s*\["italic"\]/);
		expect(italicBlock).toMatch(/preload:\s*false/);
	});

	it("la romaine, elle, RESTE préchargée", () => {
		// C'est elle qui peint le `h1` de l'étal, porteur du LCP mobile (mesuré).
		expect(romanBlock).toMatch(/preload:\s*true/);
	});

	it("les deux loaders chargent la MÊME famille Google — c'est ce qui fait cohabiter les faces", () => {
		// L'invariant central. Deux appels de la même famille émettent la même
		// `font-family` (`Winky Sans`), donc `italic` sélectionne la vraie face
		// dessinée. Pointer le second loader ailleurs — ou un futur next/font qui
		// hacherait un nom par appel — ferait retomber les 6 usages en faux-oblique
		// SANS erreur ni avertissement.
		expect(googleFamily(italicBlock)).toBe(googleFamily(romanBlock));
	});

	it("aucune variable `--font-display-italic` n'est exposée au thème Tailwind", () => {
		// Elle vaudrait exactement `--font-display` : une distinction imaginaire, qui
		// laisserait croire que les usages doivent choisir entre deux familles.
		const globals = readFileSync(join(ROOT, "app/globals.css"), "utf8");
		const themeEntry = /^\s*--font-display-italic:\s*var\(--font-display-italic\);/m.test(globals);
		expect(themeEntry).toBe(false);
	});

	it("la variable du loader italique est publiée sur <html>", () => {
		// Elle n'est lue par personne : c'est le HOOK qui garde le loader — donc son
		// `@font-face` — dans le graphe de modules. Sans référence, la face italique
		// disparaît du CSS et les 6 usages retombent en faux-oblique.
		const layout = readFileSync(join(ROOT, "app/layout.tsx"), "utf8");
		expect(layout).toMatch(/winkySansItalic\.variable/);
	});
});

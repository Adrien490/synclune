/**
 * @regression bottom-bar-touch-target-px
 *
 * Verrouille le fait que la largeur minimale d'un onglet de la barre du bas est
 * exprimée en **px**, et non en rem (audit design bottom-bar 2026-08-04, P1).
 *
 * Le défaut d'origine : `bottomBarItemClass` portait `min-w-16`, soit
 * `min-width: 4rem`. À 200 % de police racine — un réglage d'accessibilité
 * courant, couvert par WCAG 1.4.4 — cela vaut **128 px par onglet**. Mesuré le
 * 2026-08-04 sur `/` à 390 px de large avec `font-size: 32px` sur `html` :
 *
 *     navScrollW = 512   navClientW = 390   onglet Panier : x=384 → right=512
 *
 * Et comme la barre est `position: fixed`, ce débordement **n'étend pas**
 * `document.documentElement.scrollWidth` (resté à 390) : il n'existait donc
 * AUCUN geste — pas même un scroll horizontal — pour atteindre l'onglet perdu.
 * La fonction commerciale du site disparaissait purement et simplement pour qui
 * agrandit le texte de son téléphone.
 *
 * ⚠️ Le piège est que ce projet a appris l'inverse le 2026-07-26 : les **seuils
 * de breakpoint** doivent être en rem, sans quoi ils décrochent du CSS quand la
 * police racine change (cf. `no-px-media-query.regression.test.ts`). Les deux
 * règles ne se contredisent pas, elles portent sur deux grandeurs différentes :
 *
 *   - un SEUIL décrit une largeur de texte  → il suit la police racine → rem ;
 *   - une CIBLE TACTILE décrit un doigt     → un doigt ne grandit pas   → px.
 *
 * Toute modification de ce test requiert une review explicite.
 */
import { describe, expect, it } from "vitest";

import { bottomBarContainerClass, bottomBarItemClass } from "../bottom-bar.styles";

/** Valeur plancher de WCAG 2.5.5 (Target Size), en CSS px. */
const WCAG_MIN_TARGET_PX = 44;

/** Largeur du plus petit viewport que le dépôt teste (`VIEWPORTS.REFLOW_320`). */
const NARROWEST_VIEWPORT_PX = 320;

/** Nombre d'onglets de l'hôte le plus chargé (boutique et admin en ont 5). */
const MAX_TABS = 5;

describe("@regression bottom-bar-touch-target-px — la cible tactile est en px", () => {
	it("bottomBarItemClass déclare sa largeur minimale en px", () => {
		expect(bottomBarItemClass).toContain(`min-w-[${WCAG_MIN_TARGET_PX}px]`);
	});

	it("n'emploie plus AUCUNE largeur minimale en rem (l'échelle Tailwind est en rem)", () => {
		// `min-w-16`, `min-w-11`, `min-w-3.5`… : toute valeur de l'échelle par défaut
		// est exprimée en rem et se remet donc à grandir avec la police racine.
		expect(bottomBarItemClass).not.toMatch(/(^|\s)min-w-\d/);
		expect(bottomBarItemClass).not.toMatch(/min-w-\[[\d.]+rem\]/);
	});

	it("respecte le plancher WCAG 2.5.5", () => {
		const match = bottomBarItemClass.match(/min-w-\[(\d+)px\]/);
		expect(match).not.toBeNull();
		expect(Number(match![1])).toBeGreaterThanOrEqual(WCAG_MIN_TARGET_PX);
	});

	/**
	 * Le garde qui compte vraiment : c'est cette arithmétique-là qui a échoué en
	 * production. Elle est indépendante de la police racine **parce que** la
	 * largeur est en px — avec `4rem` elle donnait 5 × 128 = 640 > 390.
	 */
	it("cinq onglets tiennent dans le plus petit viewport, à n'importe quelle police racine", () => {
		const match = bottomBarItemClass.match(/min-w-\[(\d+)px\]/);
		const minWidth = Number(match![1]);

		expect(minWidth * MAX_TABS).toBeLessThanOrEqual(NARROWEST_VIEWPORT_PX);
	});

	/**
	 * La HAUTEUR, elle, reste en rem — et c'est volontaire : elle doit grandir
	 * avec le texte pour que les libellés gardent leur place. C'est aussi pour ça
	 * que la hauteur publiée dans `--bottom-bar-height` est **mesurée** et non
	 * supposée (cf. `bottom-bar-height-contract.regression.test.ts`).
	 */
	it("la hauteur reste en rem, elle : elle doit suivre le texte", () => {
		expect(bottomBarItemClass).toContain("min-h-14");
		expect(bottomBarContainerClass).toContain("h-14");
	});
});

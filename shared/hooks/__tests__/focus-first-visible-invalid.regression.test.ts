/**
 * @regression focus-first-visible-invalid — le focus d'erreur ignore les variantes masquées
 *
 * Bug corrigé : `focusFirstInvalid()` (et `ErrorSummary.focusField()`) prenaient le
 * PREMIER `[aria-invalid="true"]` dans l'ordre du DOM.
 *
 * Or `SelectField` rend ses DEUX variantes en permanence, la visibilité étant
 * purement CSS : le `<select>` natif (wrapper `md:hidden`, `id={name}`) vient en
 * premier, le trigger Radix (wrapper `hidden md:flex`, `id={name}-desktop`)
 * ensuite — et `aria-invalid` est posé sur les deux. En desktop, la cible était
 * donc un élément `display:none` : `scrollIntoView()` et `focus()` y sont deux
 * no-op silencieux, et le focus restait où il était après une soumission
 * invalide (violation WCAG 3.3.1, sans aucun signal visible).
 *
 * `findFirstVisible` filtre sur le rendu réel, avec un repli explicite sur le
 * premier candidat quand aucun n'est mesurable (jsdom n'a pas de moteur de
 * layout) — repli couvert ci-dessous, car c'est lui qui garantit qu'on ne casse
 * pas le comportement de toute la suite de tests existante.
 */
import { describe, expect, it } from "vitest";

import { findFirstVisible } from "../use-focus-first-error";

/** Élément dont on contrôle le verdict de `checkVisibility()`. */
function makeElement(visible: boolean): HTMLElement {
	const el = document.createElement("input");
	Object.defineProperty(el, "checkVisibility", {
		configurable: true,
		value: () => visible,
	});
	return el;
}

describe("@regression focus-first-visible-invalid", () => {
	it("saute la variante masquée et retourne la variante rendue", () => {
		const hiddenNativeSelect = makeElement(false);
		const visibleRadixTrigger = makeElement(true);

		expect(findFirstVisible([hiddenNativeSelect, visibleRadixTrigger])).toBe(visibleRadixTrigger);
	});

	it("retourne le premier élément quand il est déjà visible", () => {
		const first = makeElement(true);
		const second = makeElement(true);

		expect(findFirstVisible([first, second])).toBe(first);
	});

	it("retombe sur le premier candidat quand AUCUN n'est mesurable (jsdom)", () => {
		// Sans `checkVisibility`, jsdom renvoie toujours `getClientRects() === []`.
		// Sans ce repli, le hook cesserait de focaliser quoi que ce soit en test.
		const first = document.createElement("input");
		const second = document.createElement("input");

		expect(first.getClientRects()).toHaveLength(0);
		expect(findFirstVisible([first, second])).toBe(first);
	});

	it("retourne null sur une liste vide", () => {
		expect(findFirstVisible([])).toBeNull();
	});

	it("accepte une NodeList (sortie directe de querySelectorAll)", () => {
		document.body.innerHTML = `
			<form>
				<select id="country" aria-invalid="true"></select>
				<button id="country-desktop" aria-invalid="true"></button>
			</form>`;
		const nodes = document.querySelectorAll<HTMLElement>('[aria-invalid="true"]');

		expect(nodes).toHaveLength(2);
		expect(findFirstVisible(nodes)).toBe(nodes[0]);

		document.body.innerHTML = "";
	});
});

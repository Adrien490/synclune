/**
 * @regression qs-keyboard-navigation-survives-reopen
 *
 * La navigation clavier du quick search était MORTE à partir de la 2ᵉ ouverture
 * du dialog (audit recherche 2026-08-01, P1-1).
 *
 * Cause : `useKeyboardNavigation` attachait son `MutationObserver` et exécutait
 * son `refresh()` dans un effet `[]`, qui capturait `contentRef.current` UNE
 * SEULE fois — à la première ouverture. Or le conteneur de résultats vit dans
 * `DialogContent`, que Radix démonte à la fermeture (Portal), tandis que
 * `QuickSearchDialog` lui-même reste monté à vie après la première ouverture
 * (`quick-search-dialog-lazy.tsx` : « once mounted, the dialog stays mounted »).
 * À la réouverture, le conteneur est un NOUVEAU nœud : l'effet ne re-tournait
 * pas, `focusablesRef` pointait des éléments détachés, aucun `id="qs-nav-i"`
 * n'était posé sur les nouvelles options — flèches inertes en idle (`focus()`
 * sur nœud détaché), `aria-activedescendant` pendouillant en mode recherche,
 * Enter cliquant un nœud détaché.
 *
 * Passé inaperçu parce que souris/tap/frappe fonctionnaient, et que TOUS les
 * tests (unitaires et E2E) n'ouvraient le dialog qu'une seule fois.
 *
 * Ce harness reproduit le cycle Portal : le hook reste monté, le conteneur
 * (avec `ref`) est démonté puis remonté avec de NOUVELLES options — exactement
 * ce que fait Radix entre deux ouvertures.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { createElement, type FC } from "react";

import { useKeyboardNavigation } from "../use-keyboard-navigation";

// Même mock que les suites voisines : observe() déclenche le refresh
// synchrone pour que les focusables soient indexés à l'attache.
class MockMutationObserver {
	private callback: MutationCallback;
	observe() {
		this.callback([], this as unknown as MutationObserver);
	}
	disconnect() {}
	takeRecords(): MutationRecord[] {
		return [];
	}
	constructor(callback: MutationCallback) {
		this.callback = callback;
	}
}

vi.stubGlobal("MutationObserver", MockMutationObserver);

Element.prototype.scrollIntoView = vi.fn();

type HookResult = ReturnType<typeof useKeyboardNavigation>;

const hookResultRef = { current: null as HookResult | null };

/**
 * `open` contrôle le rendu du conteneur, PAS le montage du harness — comme
 * Radix contrôle le Portal pendant que `QuickSearchDialog` reste monté.
 * `generation` force des nœuds option NEUFS à chaque réouverture (clés
 * différentes), comme le remontage réel du contenu du dialog.
 */
const Harness: FC<{
	open: boolean;
	generation: number;
	isSearchMode?: boolean;
}> = ({ open, generation, isSearchMode = true }) => {
	const nav = useKeyboardNavigation({ isSearchMode });
	// eslint-disable-next-line react-hooks/immutability -- test harness pattern
	hookResultRef.current = nav;
	if (!open) return null;
	return createElement("div", { ref: nav.contentRef, onKeyDown: nav.handleArrowNavigation }, [
		createElement("button", { key: `a-${generation}`, role: "option", "data-qs-option": "" }, "A"),
		createElement("button", { key: `b-${generation}`, role: "option", "data-qs-option": "" }, "B"),
	]);
};

function makeEvent(key: string) {
	return { key, preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLDivElement>;
}

describe("useKeyboardNavigation — survit au cycle fermeture/réouverture du Portal", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("indexe les NOUVELLES options après un démontage/remontage du conteneur (mode recherche)", () => {
		const { container, rerender } = render(createElement(Harness, { open: true, generation: 1 }));

		// 1ʳᵉ ouverture : les options sont indexées.
		const firstGen = Array.from(container.querySelectorAll("[data-qs-option]"));
		expect(firstGen.map((el) => el.id)).toEqual(["qs-nav-0", "qs-nav-1"]);

		// Fermeture (Radix démonte le Portal) puis réouverture avec des nœuds NEUFS.
		rerender(createElement(Harness, { open: false, generation: 1 }));
		rerender(createElement(Harness, { open: true, generation: 2 }));

		const secondGen = Array.from(container.querySelectorAll("[data-qs-option]"));
		expect(secondGen).toHaveLength(2);
		// Les nouvelles options doivent être (ré)indexées — c'est ce qui manquait.
		expect(secondGen.map((el) => el.id)).toEqual(["qs-nav-0", "qs-nav-1"]);

		// La surbrillance doit atterrir sur le nœud VIVANT, pas sur l'ancien détaché.
		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("ArrowDown")));
		expect(hookResultRef.current!.activeDescendantId).toBe("qs-nav-0");
		expect(secondGen[0]!.getAttribute("data-active")).toBe("true");
		expect(secondGen[0]!.getAttribute("aria-selected")).toBe("true");
	});

	it("déplace le focus réel sur la NOUVELLE option après réouverture (mode idle)", () => {
		const { container, rerender } = render(
			createElement(Harness, { open: true, generation: 1, isSearchMode: false }),
		);

		rerender(createElement(Harness, { open: false, generation: 1, isSearchMode: false }));
		rerender(createElement(Harness, { open: true, generation: 2, isSearchMode: false }));

		const options = Array.from(container.querySelectorAll<HTMLElement>("[data-qs-option]"));
		expect(options).toHaveLength(2);

		act(() => hookResultRef.current!.handleArrowNavigation(makeEvent("ArrowDown")));

		// Avec le bug, `focus()` partait sur un nœud détaché de la 1ʳᵉ génération :
		// le focus ne bougeait pas.
		expect(document.activeElement).toBe(options[0]);
	});
});

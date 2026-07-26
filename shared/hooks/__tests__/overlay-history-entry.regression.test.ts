/**
 * @regression overlay-history-entry
 *
 * Deux défauts symétriques de la gestion d'historique des overlays, audit
 * « Overlays » 2026-07-26.
 *
 * ## 1. L'entrée orpheline (P1-1)
 *
 * `useBackButtonClose` pousse une entrée d'historique à l'ouverture pour que le
 * retour matériel ferme l'overlay au lieu de quitter la page. Seul `Drawer`
 * reprenait cette entrée à la fermeture ; `Sheet`, `Dialog` et `AlertDialog`
 * jetaient le `handleClose` renvoyé par le hook.
 *
 * Comme le `pushState` est fait **sans URL**, l'entrée orpheline porte la même
 * URL que la page : la pression suivante sur le retour matériel ne produisait
 * rien de visible. Un « back » mort par cycle ouvrir/fermer, cumulatif — ouvrir
 * et fermer le panier 3 fois exigeait 4 pressions pour quitter la page.
 *
 * ## 2. Le recul qui défait une navigation (P1-2)
 *
 * Symétriquement, reculer systématiquement est faux. `history.back()` ne reprend
 * NOTRE entrée que si elle est encore au sommet. Si un `router.push` a eu lieu
 * pendant que l'overlay était ouvert (drawer de filtres, de tri, `<Link>` dans
 * une feuille de navigation), reculer défait cette navigation : le filtre qu'on
 * vient d'appliquer disparaît de l'URL.
 *
 * C'est la classe de bug déjà attrapée sur `responsive-action-menu`
 * (`link-history-back.regression.test.tsx`), corrigée là-bas localement et
 * jamais remontée dans la primitive. La garde vit désormais dans le hook :
 * comparaison de `history.length` avec sa valeur au moment du push.
 */

import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isOverlayInitiatedPop, useBackButtonClose } from "../use-back-button-close";

// `pushState` n'est volontairement PAS mocké ici : tout le correctif repose sur
// `history.length`, que le mock de la suite voisine fige. Un test qui mocke la
// mesure ne peut pas prouver la garde qui en dépend.
let backSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	backSpy = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
});

afterEach(() => {
	cleanup();
	// `isOverlayInitiatedPop` s'appuie sur un compteur module-level désarmé par le
	// `popstate` que `history.back()` provoque. `back()` étant mocké ici, aucun
	// `popstate` n'arrive et le drapeau resterait armé jusqu'au filet de 500 ms —
	// il fuirait alors dans le test suivant. On le draine explicitement.
	while (isOverlayInitiatedPop()) {
		window.dispatchEvent(new PopStateEvent("popstate"));
	}
	backSpy.mockRestore();
});

describe("@regression overlay-history-entry", () => {
	describe("reprise de l'entrée (pas de back mort)", () => {
		it("reprend l'entrée poussée quand l'overlay se ferme normalement", () => {
			const onClose = vi.fn();
			const { result } = renderHook(() =>
				useBackButtonClose({ isOpen: true, onClose, id: "sheet" }),
			);

			act(() => {
				result.current.handleClose();
			});

			expect(backSpy).toHaveBeenCalledTimes(1);
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("ne reprend rien si l'overlay n'a jamais poussé d'entrée", () => {
			const { result } = renderHook(() =>
				useBackButtonClose({ isOpen: false, onClose: vi.fn(), id: "sheet" }),
			);

			act(() => {
				result.current.handleClose();
			});

			expect(backSpy).not.toHaveBeenCalled();
		});

		it("n'accumule pas d'entrées sur des cycles ouvrir/fermer répétés", () => {
			let isOpen = true;
			const onClose = vi.fn();
			const { result, rerender } = renderHook(() =>
				useBackButtonClose({ isOpen, onClose, id: "sheet" }),
			);

			const lengthBefore = window.history.length;

			for (let cycle = 0; cycle < 3; cycle += 1) {
				act(() => {
					result.current.handleClose();
				});
				isOpen = false;
				rerender();
				isOpen = true;
				rerender();
			}

			// 3 fermetures → 3 reprises. Sans elles, 3 entrées seraient restées
			// enterrées et auraient avalé 3 pressions du retour matériel.
			expect(backSpy).toHaveBeenCalledTimes(3);
			// La dernière ouverture est encore en vol : exactement une entrée de plus.
			// (jsdom n'exécute pas le `back()` mocké, d'où la comparaison sur le push.)
			expect(window.history.length).toBe(lengthBefore + 3);
		});
	});

	describe("garde anti-annulation de navigation", () => {
		it("ne recule PAS quand une navigation a empilé une entrée depuis l'ouverture", () => {
			const onClose = vi.fn();
			const { result } = renderHook(() =>
				useBackButtonClose({ isOpen: true, onClose, id: "drawer" }),
			);

			// Ce que fait `router.push("?filter_status=PAID")` d'un drawer de filtres.
			act(() => {
				window.history.pushState({}, "", "?filter_status=PAID");
			});

			act(() => {
				result.current.handleClose();
			});

			expect(
				backSpy,
				"reculer ici défait le router.push : le filtre appliqué disparaît de l'URL",
			).not.toHaveBeenCalled();
			// La fermeture reste effective — seule la manipulation d'historique est retenue.
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("ne recule pas non plus quand un overlay enfant a poussé par-dessus", () => {
			const parentClose = vi.fn();
			const parent = renderHook(() =>
				useBackButtonClose({ isOpen: true, onClose: parentClose, id: "parent" }),
			);
			renderHook(() => useBackButtonClose({ isOpen: true, onClose: vi.fn(), id: "child" }));

			act(() => {
				parent.result.current.handleClose();
			});

			// Reculer consommerait l'entrée de l'ENFANT, encore ouvert.
			expect(backSpy).not.toHaveBeenCalled();
			expect(parentClose).toHaveBeenCalledTimes(1);
		});
	});

	describe("signal isOverlayInitiatedPop", () => {
		it("est armé pendant le back d'une fermeture d'overlay, désarmé au popstate", () => {
			const { result } = renderHook(() =>
				useBackButtonClose({ isOpen: true, onClose: vi.fn(), id: "drawer" }),
			);

			expect(isOverlayInitiatedPop()).toBe(false);

			act(() => {
				result.current.handleClose();
			});

			// La garde `use-unsaved-changes` interroge ce drapeau pour ne pas
			// confondre cette fermeture avec un départ de page.
			expect(isOverlayInitiatedPop()).toBe(true);

			act(() => {
				window.dispatchEvent(new PopStateEvent("popstate"));
			});

			expect(isOverlayInitiatedPop()).toBe(false);
		});

		it("reste désarmé quand aucun back n'a lieu (navigation en vol)", () => {
			const { result } = renderHook(() =>
				useBackButtonClose({ isOpen: true, onClose: vi.fn(), id: "drawer" }),
			);

			act(() => {
				window.history.pushState({}, "", "?sort=price");
			});
			act(() => {
				result.current.handleClose();
			});

			expect(isOverlayInitiatedPop()).toBe(false);
		});
	});

	describe("StrictMode", () => {
		// En dev, React monte les effets, les démonte, puis les remonte. Le cleanup
		// de démontage retirait l'entrée de la pile LIFO tandis que le `pushState`,
		// gardé par un ref, ne se rejouait pas : l'overlay restait hors de la pile
		// avec le ref à `true`, donc `isTopEntry` définitivement faux — le retour
		// matériel ne le fermait plus DU TOUT. Invisible pour la suite, qui ne
		// montait pas en StrictMode ; visible pour quiconque teste à la main en dev.
		it("reste fermable au retour matériel après un double montage", () => {
			const onClose = vi.fn();

			renderHook(() => useBackButtonClose({ isOpen: true, onClose, id: "sheet" }), {
				wrapper: StrictMode,
			});

			act(() => {
				window.dispatchEvent(new PopStateEvent("popstate"));
			});

			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("ne pousse qu'une seule entrée malgré le double montage", () => {
			const pushSpy = vi.spyOn(window.history, "pushState");

			renderHook(() => useBackButtonClose({ isOpen: true, onClose: vi.fn(), id: "sheet" }), {
				wrapper: StrictMode,
			});

			expect(pushSpy).toHaveBeenCalledTimes(1);
			pushSpy.mockRestore();
		});
	});

	describe("état d'historique du router préservé", () => {
		it("recopie l'état existant au lieu de l'écraser", () => {
			window.history.pushState({ __NA: "next-internal" }, "");

			renderHook(() => useBackButtonClose({ isOpen: true, onClose: vi.fn(), id: "sheet" }));

			// Écraser `history.state` privait l'App Router de son arbre de segments
			// et le poussait vers une navigation MPA sur un retour avant.
			expect(window.history.state).toMatchObject({ __NA: "next-internal", sheet: true });
		});
	});
});

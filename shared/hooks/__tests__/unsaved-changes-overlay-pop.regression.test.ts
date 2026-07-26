/**
 * @regression unsaved-changes-overlay-pop
 *
 * Fermer un overlay sur un formulaire dirty ne doit pas déclencher la garde
 * « modifications non enregistrées ».
 *
 * Audit « Overlays » 2026-07-26 (P1-4) : `use-unsaved-changes` est un TROISIÈME
 * acteur d'historique, à côté de la pile LIFO de `use-back-button-close` et du
 * router. Il pousse sa propre entrée et écoute `popstate` sans rien connaître
 * des overlays (`interceptHistoryNavigation` vaut `true` par défaut et n'est
 * surchargé nulle part).
 *
 * Conséquence sur les 23 formulaires admin : ouvrir puis fermer un drawer
 * pendant que le formulaire est dirty déclenchait le `history.back()` de
 * `handleClose`, que la garde interprétait comme un départ de page → un
 * `window.confirm` natif « Vous avez des modifications non sauvegardées »
 * surgissait alors que l'utilisateur n'avait fermé qu'un overlay.
 *
 * L'entrée consommée par ce `back()` est celle de l'OVERLAY ; celle de la garde
 * est en dessous et reste en place — la garde a donc raison de ne rien faire, et
 * reste armée pour un vrai retour ultérieur (couvert plus bas).
 */

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isOverlayInitiatedPop, useBackButtonClose } from "../use-back-button-close";
import { useUnsavedChanges } from "../use-unsaved-changes";

let confirmSpy: ReturnType<typeof vi.spyOn>;
let backSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
	backSpy = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
});

afterEach(() => {
	cleanup();
	// Drainer le compteur module-level : `back()` est mocké, donc le `popstate`
	// qui le désarme n'arrive jamais tout seul.
	while (isOverlayInitiatedPop()) {
		window.dispatchEvent(new PopStateEvent("popstate"));
	}
	confirmSpy.mockRestore();
	backSpy.mockRestore();
});

function firePopstate(): void {
	window.dispatchEvent(new PopStateEvent("popstate"));
}

describe("@regression unsaved-changes-overlay-pop", () => {
	it("ne confirme pas quand le popstate vient de la fermeture d'un overlay", () => {
		// Formulaire admin dirty → la garde est armée et a poussé son entrée.
		renderHook(() => useUnsavedChanges(true));
		// Un drawer s'ouvre par-dessus → il pousse la sienne.
		const drawer = renderHook(() =>
			useBackButtonClose({ isOpen: true, onClose: vi.fn(), id: "drawer" }),
		);

		act(() => {
			drawer.result.current.handleClose();
		});
		act(() => {
			firePopstate();
		});

		expect(backSpy).toHaveBeenCalledTimes(1);
		expect(
			confirmSpy,
			"la garde a confondu la fermeture d'un overlay avec un départ de page",
		).not.toHaveBeenCalled();
	});

	it("confirme toujours sur un vrai retour utilisateur", () => {
		renderHook(() => useUnsavedChanges(true));

		// Aucun overlay impliqué : le drapeau est désarmé, la garde doit réagir.
		expect(isOverlayInitiatedPop()).toBe(false);

		act(() => {
			firePopstate();
		});

		expect(confirmSpy).toHaveBeenCalledTimes(1);
	});

	it("reste armée après une fermeture d'overlay ignorée", () => {
		renderHook(() => useUnsavedChanges(true));
		const drawer = renderHook(() =>
			useBackButtonClose({ isOpen: true, onClose: vi.fn(), id: "drawer" }),
		);

		act(() => {
			drawer.result.current.handleClose();
		});
		act(() => {
			firePopstate();
		});
		confirmSpy.mockClear();

		// Le retour suivant est bien un départ de page : la garde doit confirmer.
		act(() => {
			firePopstate();
		});

		expect(confirmSpy).toHaveBeenCalledTimes(1);
	});
});

import { renderHook, act, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";

import { useBackButtonClose } from "../use-back-button-close";

// Le hook coordonne désormais les overlays imbriqués via une pile LIFO partagée
// (module-level). On démonte les hooks entre chaque test pour drainer cette pile
// (le cleanup de démontage retire l'entrée + reset le compteur de suppression).
afterEach(cleanup);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fires a popstate event on window.
 */
function firePopstate(): void {
	window.dispatchEvent(new PopStateEvent("popstate"));
}

/**
 * Attend qu'une traversée d'historique aboutisse : `history.back()` restaure
 * `history.state` puis émet `popstate` de façon asynchrone, comme un navigateur.
 *
 * Renvoie `true` si un `popstate` a bien été observé. Les appelants DOIVENT
 * l'asserter : sans ça, un test « l'overlay parent ne se ferme pas » passerait
 * aussi bien parce que la traversée n'a jamais eu lieu — vert pour la mauvaise
 * raison. (C'est exactement ce qui est arrivé avec une attente de 0 ms.)
 */
async function flushHistory(): Promise<boolean> {
	let observed = false;

	await act(async () => {
		await new Promise<void>((resolve) => {
			const done = () => {
				window.removeEventListener("popstate", onPop);
				clearTimeout(timer);
				resolve();
			};
			const onPop = () => {
				observed = true;
				done();
			};
			// Ajouté en dernier : les écouteurs du hook ont déjà réagi quand on résout.
			window.addEventListener("popstate", onPop);
			const timer = setTimeout(done, 200);
		});
	});

	return observed;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useBackButtonClose", () => {
	beforeEach(() => {
		// Espion *pass-through* : la vraie `pushState` de jsdom s'exécute, donc
		// `history.state` et `history.length` sont réels. Le hook s'appuie sur les
		// deux (jeton d'entrée, garde anti-annulation de navigation) — les figer
		// avec un `mockImplementation` rendrait ces tests verts sans rien prouver.
		vi.spyOn(window.history, "pushState");
	});

	// -------------------------------------------------------------------------
	// History management
	// -------------------------------------------------------------------------

	describe("history management", () => {
		it("calls pushState with the default id when isOpen=true", () => {
			renderHook(() => useBackButtonClose({ isOpen: true, onClose: vi.fn() }));

			expect(window.history.pushState).toHaveBeenCalledWith(
				expect.objectContaining({ modal: true }),
				"",
			);
		});

		it("uses the custom id in the pushed state object", () => {
			renderHook(() => useBackButtonClose({ isOpen: true, onClose: vi.fn(), id: "cart-drawer" }));

			expect(window.history.pushState).toHaveBeenCalledWith(
				expect.objectContaining({ "cart-drawer": true }),
				"",
			);
		});

		it("does NOT call pushState when isOpen=false initially", () => {
			renderHook(() => useBackButtonClose({ isOpen: false, onClose: vi.fn() }));

			expect(window.history.pushState).not.toHaveBeenCalled();
		});

		it("calls pushState only once even after multiple renders while open", () => {
			const { rerender } = renderHook(() => useBackButtonClose({ isOpen: true, onClose: vi.fn() }));

			rerender();
			rerender();

			expect(window.history.pushState).toHaveBeenCalledTimes(1);
		});

		it("calls pushState again when modal re-opens after closing", () => {
			let isOpen = true;
			const { rerender } = renderHook(() => useBackButtonClose({ isOpen, onClose: vi.fn() }));

			// Close the modal
			isOpen = false;
			rerender();

			// Re-open the modal
			isOpen = true;
			rerender();

			expect(window.history.pushState).toHaveBeenCalledTimes(2);
		});
	});

	// -------------------------------------------------------------------------
	// Popstate listener registration
	// -------------------------------------------------------------------------

	describe("popstate listener", () => {
		it("registers a popstate listener when isOpen=true", () => {
			const addSpy = vi.spyOn(window, "addEventListener");

			renderHook(() => useBackButtonClose({ isOpen: true, onClose: vi.fn() }));

			const popstateCalls = (addSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "popstate",
			);
			expect(popstateCalls.length).toBeGreaterThan(0);
		});

		it("does NOT register a popstate listener when isOpen=false", () => {
			const addSpy = vi.spyOn(window, "addEventListener");

			renderHook(() => useBackButtonClose({ isOpen: false, onClose: vi.fn() }));

			const popstateCalls = (addSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "popstate",
			);
			expect(popstateCalls.length).toBe(0);
		});

		it("removes the popstate listener on unmount", () => {
			const removeSpy = vi.spyOn(window, "removeEventListener");

			const { unmount } = renderHook(() => useBackButtonClose({ isOpen: true, onClose: vi.fn() }));

			unmount();

			const popstateCalls = (removeSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "popstate",
			);
			expect(popstateCalls.length).toBeGreaterThan(0);
		});

		it("removes the popstate listener when isOpen transitions from true to false", () => {
			const removeSpy = vi.spyOn(window, "removeEventListener");
			let isOpen = true;

			const { rerender } = renderHook(() => useBackButtonClose({ isOpen, onClose: vi.fn() }));

			isOpen = false;
			rerender();

			const popstateCalls = (removeSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "popstate",
			);
			expect(popstateCalls.length).toBeGreaterThan(0);
		});

		it("does not throw when unmounting while isOpen=false", () => {
			expect(() => {
				const { unmount } = renderHook(() =>
					useBackButtonClose({ isOpen: false, onClose: vi.fn() }),
				);
				unmount();
			}).not.toThrow();
		});
	});

	// -------------------------------------------------------------------------
	// onClose callback via popstate
	// -------------------------------------------------------------------------

	describe("onClose callback via popstate", () => {
		it("calls onClose when popstate fires and isOpen=true", () => {
			const onClose = vi.fn();

			renderHook(() => useBackButtonClose({ isOpen: true, onClose }));

			act(() => {
				firePopstate();
			});

			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("does NOT call onClose when popstate fires and isOpen=false", () => {
			const onClose = vi.fn();

			renderHook(() => useBackButtonClose({ isOpen: false, onClose }));

			act(() => {
				firePopstate();
			});

			expect(onClose).not.toHaveBeenCalled();
		});

		it("does NOT call onClose a second time on subsequent popstate after it was already triggered", () => {
			const onClose = vi.fn();

			renderHook(() => useBackButtonClose({ isOpen: true, onClose }));

			act(() => {
				firePopstate();
			});

			act(() => {
				firePopstate();
			});

			// Only the first popstate should have triggered onClose; after that
			// historyPushedRef is false so the handler is a no-op.
			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("does NOT call onClose when popstate fires after isOpen transitions to false", () => {
			const onClose = vi.fn();
			let isOpen = true;

			const { rerender } = renderHook(() => useBackButtonClose({ isOpen, onClose }));

			isOpen = false;
			rerender();

			act(() => {
				firePopstate();
			});

			expect(onClose).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// handleClose
	// -------------------------------------------------------------------------

	describe("handleClose", () => {
		it("calls onClose when handleClose is invoked", () => {
			const onClose = vi.fn();

			const { result } = renderHook(() => useBackButtonClose({ isOpen: true, onClose }));

			act(() => {
				result.current.handleClose();
			});

			expect(onClose).toHaveBeenCalledTimes(1);
		});

		it("after handleClose, a subsequent popstate does NOT call onClose again", () => {
			const onClose = vi.fn();

			const { result } = renderHook(() => useBackButtonClose({ isOpen: true, onClose }));

			act(() => {
				result.current.handleClose();
			});

			// Reset call count so we can verify popstate does not fire onClose again
			onClose.mockClear();

			act(() => {
				firePopstate();
			});

			expect(onClose).not.toHaveBeenCalled();
		});

		it("is returned by the hook", () => {
			const { result } = renderHook(() => useBackButtonClose({ isOpen: true, onClose: vi.fn() }));

			expect(typeof result.current.handleClose).toBe("function");
		});
	});

	// -------------------------------------------------------------------------
	// Lifecycle transitions
	// -------------------------------------------------------------------------

	describe("lifecycle transitions", () => {
		it("opening (false -> true) pushes state and registers popstate listener", () => {
			const addSpy = vi.spyOn(window, "addEventListener");
			let isOpen = false;

			const { rerender } = renderHook(() => useBackButtonClose({ isOpen, onClose: vi.fn() }));

			// No listener or pushState yet
			expect(window.history.pushState).not.toHaveBeenCalled();
			expect(
				(addSpy.mock.calls as [string, ...unknown[]][]).filter(([e]) => e === "popstate").length,
			).toBe(0);

			isOpen = true;
			rerender();

			expect(window.history.pushState).toHaveBeenCalledTimes(1);
			expect(
				(addSpy.mock.calls as [string, ...unknown[]][]).filter(([e]) => e === "popstate").length,
			).toBeGreaterThan(0);
		});

		it("closing (true -> false) removes popstate listener and resets ref so pushState fires again on next open", () => {
			const removeSpy = vi.spyOn(window, "removeEventListener");
			let isOpen = true;

			const { rerender } = renderHook(() => useBackButtonClose({ isOpen, onClose: vi.fn() }));

			vi.mocked(window.history.pushState).mockClear();

			isOpen = false;
			rerender();

			// Listener removed
			expect(
				(removeSpy.mock.calls as [string, ...unknown[]][]).filter(([e]) => e === "popstate").length,
			).toBeGreaterThan(0);

			// Re-open: pushState must fire again (ref was reset on close)
			isOpen = true;
			rerender();

			expect(window.history.pushState).toHaveBeenCalledTimes(1);
		});

		it("reopening after close pushes a new state entry", () => {
			let isOpen = true;
			const { rerender } = renderHook(() => useBackButtonClose({ isOpen, onClose: vi.fn() }));

			// First open
			expect(window.history.pushState).toHaveBeenCalledTimes(1);

			isOpen = false;
			rerender();

			isOpen = true;
			rerender();

			// Second open should push another state entry
			expect(window.history.pushState).toHaveBeenCalledTimes(2);
		});

		it("onClose is called via popstate after reopening", () => {
			const onClose = vi.fn();
			let isOpen = true;

			const { rerender } = renderHook(() => useBackButtonClose({ isOpen, onClose }));

			// Close via popstate on first open
			act(() => {
				firePopstate();
			});

			expect(onClose).toHaveBeenCalledTimes(1);
			onClose.mockClear();

			// Simulate external re-open (isOpen controlled externally)
			isOpen = false;
			rerender();

			isOpen = true;
			rerender();

			// Back button on second open should also trigger onClose
			act(() => {
				firePopstate();
			});

			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});

	// -------------------------------------------------------------------------
	// Nested overlays (LIFO coordination) — fixes the admin selection-mode bugs:
	// closing a child drawer (history.back) must not close the parent overlay,
	// and a hardware back must only close the topmost overlay.
	// -------------------------------------------------------------------------

	describe("nested overlays", () => {
		// Ces cas s'appuient sur la VRAIE traversée d'historique de jsdom (`back()`
		// restaure `history.state` et émet `popstate` de façon asynchrone). Le
		// discriminant du hook lit ce state : un `firePopstate()` synthétique
		// laisserait `history.state` sur l'entrée de l'enfant et testerait une
		// situation qui n'arrive jamais.
		function openOverlay(id: string, onClose: () => void) {
			return renderHook(() => useBackButtonClose({ isOpen: true, onClose, id }));
		}

		// @regression nested-overlay-programmatic-close-keeps-parent
		// Un drawer enfant fermé via handleClose (→ history.back) ne doit PAS
		// fermer l'overlay parent resté ouvert (ex. drawer d'actions groupées
		// au-dessus du mode sélection admin).
		it("closing a child via handleClose does NOT close the still-open parent", async () => {
			const parentClose = vi.fn();
			const childClose = vi.fn();

			// Parent ouvert en premier (ex. bottom-bar du mode sélection)
			openOverlay("parent", parentClose);
			// Enfant ouvert par-dessus (ex. drawer « ... »)
			const child = openOverlay("child", childClose);

			act(() => {
				child.result.current.handleClose();
			});

			expect(await flushHistory(), "la traversée d'historique n'a pas eu lieu").toBe(true);
			expect(childClose).toHaveBeenCalledTimes(1);
			// Le parent se reconnaît à son jeton dans l'entrée atteinte → reste ouvert.
			expect(parentClose).not.toHaveBeenCalled();
		});

		// @regression nested-overlay-hardware-back-closes-top-only
		// Un back matériel ferme uniquement l'overlay au sommet de la pile.
		it("a hardware back closes only the topmost overlay", async () => {
			const parentClose = vi.fn();
			const childClose = vi.fn();

			openOverlay("parent", parentClose);
			openOverlay("child", childClose);

			act(() => {
				window.history.back();
			});

			expect(await flushHistory(), "la traversée d'historique n'a pas eu lieu").toBe(true);
			expect(childClose).toHaveBeenCalledTimes(1);
			expect(parentClose).not.toHaveBeenCalled();
		});

		// @regression nested-overlay-back-not-swallowed-after-child-close
		// Le compteur `suppressNextPops` qu'on a remplacé « avalait » le pop suivant
		// sans vérifier lequel : après la fermeture programmatique d'un enfant, un
		// vrai retour matériel pouvait être absorbé et laisser le parent ouvert
		// alors que l'utilisateur avait bien demandé à reculer.
		it("a hardware back after a programmatic child close still closes the parent", async () => {
			const parentClose = vi.fn();
			const childClose = vi.fn();

			openOverlay("parent", parentClose);
			const child = openOverlay("child", childClose);

			act(() => {
				child.result.current.handleClose();
			});
			expect(await flushHistory()).toBe(true);
			expect(parentClose).not.toHaveBeenCalled();

			// Retour matériel authentique : le parent doit se fermer.
			act(() => {
				window.history.back();
			});

			expect(await flushHistory(), "la traversée d'historique n'a pas eu lieu").toBe(true);
			expect(parentClose).toHaveBeenCalledTimes(1);
		});
	});
});

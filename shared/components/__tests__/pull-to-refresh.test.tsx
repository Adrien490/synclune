import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseRouter, mockUseIsTouchDevice, mockUseReducedMotion, mockTriggerHaptic } = vi.hoisted(
	() => ({
		mockUseRouter: vi.fn(),
		mockUseIsTouchDevice: vi.fn(),
		mockUseReducedMotion: vi.fn(),
		mockTriggerHaptic: vi.fn(),
	}),
);

vi.mock("next/navigation", () => ({ useRouter: mockUseRouter }));
vi.mock("@/shared/hooks/use-touch-device", () => ({ useIsTouchDevice: mockUseIsTouchDevice }));
vi.mock("@/shared/hooks/use-haptic", () => ({ triggerHaptic: mockTriggerHaptic }));
vi.mock("motion/react", () => ({ useReducedMotion: mockUseReducedMotion }));

import { PULL_TO_REFRESH_EVENT, PullToRefresh } from "../pull-to-refresh";
import { useOverlayStackStore } from "@/shared/stores/use-overlay-stack-store";

/**
 * jsdom n'implémente pas `TouchEvent`. Le composant ne lit que `touches[0].clientY`
 * et `target`, donc un `Event` enrichi suffit et reste fidèle au contrat lu.
 */
function dispatchTouch(
	type: "touchstart" | "touchmove" | "touchend",
	clientY = 0,
	target?: Element,
) {
	const event = new Event(type, { bubbles: true });
	Object.defineProperty(event, "touches", { value: [{ clientY, clientX: 0 }] });
	(target ?? window).dispatchEvent(event);
}

/** Un tirage complet au-delà du seuil de déclenchement (70px). */
function pullPastThreshold(target?: Element) {
	dispatchTouch("touchstart", 0, target);
	dispatchTouch("touchmove", 40, target);
	dispatchTouch("touchmove", 100, target);
	dispatchTouch("touchend", 100, target);
}

afterEach(() => {
	cleanup();
	// Le store overlay est un singleton Zustand : le remettre à zéro évite qu'un
	// test qui simule un overlay ouvert désarme les suivants.
	useOverlayStackStore.setState({ count: 0 });
});

describe("PullToRefresh", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseRouter.mockReturnValue({ refresh: vi.fn() });
		mockUseReducedMotion.mockReturnValue(false);
	});

	describe("touch detection", () => {
		it("renders nothing when device is not touch-capable", () => {
			mockUseIsTouchDevice.mockReturnValue(false);

			const { container } = render(<PullToRefresh />);

			expect(container.firstChild).toBeNull();
		});

		it("renders the indicator container on touch devices", () => {
			mockUseIsTouchDevice.mockReturnValue(true);

			const { container } = render(<PullToRefresh />);

			expect(container.firstChild).not.toBeNull();
		});
	});

	describe("touch event listeners", () => {
		it("registers touchstart, touchmove, touchend, touchcancel listeners on mount", () => {
			mockUseIsTouchDevice.mockReturnValue(true);
			const addSpy = vi.spyOn(window, "addEventListener");

			render(<PullToRefresh />);

			const events = addSpy.mock.calls.map((c) => c[0]);
			expect(events).toContain("touchstart");
			expect(events).toContain("touchmove");
			expect(events).toContain("touchend");
			expect(events).toContain("touchcancel");
		});

		it("does NOT register listeners when not touch", () => {
			mockUseIsTouchDevice.mockReturnValue(false);
			const addSpy = vi.spyOn(window, "addEventListener");

			render(<PullToRefresh />);

			const events = addSpy.mock.calls.map((c) => c[0]);
			expect(events).not.toContain("touchstart");
		});

		it("removes listeners on unmount", () => {
			mockUseIsTouchDevice.mockReturnValue(true);
			const removeSpy = vi.spyOn(window, "removeEventListener");

			const { unmount } = render(<PullToRefresh />);
			unmount();

			const removed = removeSpy.mock.calls.map((c) => c[0]);
			expect(removed).toContain("touchstart");
			expect(removed).toContain("touchmove");
			expect(removed).toContain("touchend");
			expect(removed).toContain("touchcancel");
		});

		/**
		 * @regression ptr-no-listener-churn-per-frame
		 * `pullDistance` / `isRefreshing` figuraient dans les dépendances de l'effet
		 * alors que `handleTouchEnd` les lisait par closure : chaque `touchmove`
		 * provoquait un re-render, donc un démontage/remontage des 4 listeners
		 * `window` — soit ~60 cycles add/remove par seconde pendant le drag, avec un
		 * réenregistrement de `touchstart` en pleine gesture. Ils passent par des refs.
		 */
		it("does not re-register listeners while the finger is moving", () => {
			mockUseIsTouchDevice.mockReturnValue(true);
			const addSpy = vi.spyOn(window, "addEventListener");

			render(<PullToRefresh />);
			const initialTouchStarts = addSpy.mock.calls
				.map((c) => String(c[0]))
				.filter((e) => e === "touchstart").length;

			act(() => {
				dispatchTouch("touchstart", 0);
				for (let y = 10; y <= 120; y += 10) dispatchTouch("touchmove", y);
			});

			const afterDrag = addSpy.mock.calls
				.map((c) => String(c[0]))
				.filter((e) => e === "touchstart").length;
			expect(afterDrag).toBe(initialTouchStarts);
		});
	});

	describe("indicator a11y", () => {
		beforeEach(() => {
			mockUseIsTouchDevice.mockReturnValue(true);
		});

		it("indicator has role=status and aria-live=polite", () => {
			const { container } = render(<PullToRefresh />);

			const indicator = container.querySelector('[role="status"]');
			expect(indicator).not.toBeNull();
			expect(indicator).toHaveAttribute("aria-live", "polite");
		});

		/**
		 * `aria-hidden` sur une région `aria-live` est contradictoire : la région est
		 * annoncée mais masquée à l'arbre d'accessibilité. Le silence au repos vient
		 * du contenu, pas de l'attribut — l'icône est `aria-hidden` et le texte
		 * sr-only n'est rendu que pendant le rafraîchissement.
		 */
		it("keeps the live region exposed and empty of announceable text when idle", () => {
			const { container } = render(<PullToRefresh />);

			const indicator = container.querySelector('[role="status"]');
			expect(indicator).not.toHaveAttribute("aria-hidden");
			expect(indicator).toHaveTextContent("");
		});
	});

	describe("reduced motion", () => {
		beforeEach(() => {
			mockUseIsTouchDevice.mockReturnValue(true);
		});

		it("uses opacity-only transition when prefers-reduced-motion is on", () => {
			mockUseReducedMotion.mockReturnValue(true);

			const { container } = render(<PullToRefresh />);

			const indicator = container.querySelector('[role="status"]') as HTMLElement;
			expect(indicator.style.transition).toContain("opacity");
			expect(indicator.style.transition).not.toContain("transform");
		});

		it("uses transform + opacity transition when reduced-motion is off", () => {
			mockUseReducedMotion.mockReturnValue(false);

			const { container } = render(<PullToRefresh />);

			const indicator = container.querySelector('[role="status"]') as HTMLElement;
			expect(indicator.style.transition).toContain("transform");
			expect(indicator.style.transition).toContain("opacity");
		});
	});

	describe("haptic parsimony", () => {
		beforeEach(() => {
			mockUseIsTouchDevice.mockReturnValue(true);
		});

		/**
		 * @regression ptr-single-haptic-per-pull
		 * Le geste émettait `selection` au franchissement du seuil, `medium` au
		 * relâchement, puis `success` à la fin du refresh — 3 vibrations bien
		 * au-delà du cooldown de 80 ms, pour un seul tirage. Une seule subsiste, au
		 * franchissement du seuil (le « relâche pour rafraîchir » iOS) ; la suite est
		 * communiquée par le spinner.
		 */
		it("fires exactly one 'medium' haptic for a full pull", () => {
			render(<PullToRefresh />);

			act(() => pullPastThreshold());

			expect(mockTriggerHaptic).toHaveBeenCalledTimes(1);
			expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
		});

		it("does not fire again while the finger stays past the threshold", () => {
			render(<PullToRefresh />);

			act(() => {
				dispatchTouch("touchstart", 0);
				dispatchTouch("touchmove", 100);
				dispatchTouch("touchmove", 110);
				dispatchTouch("touchmove", 120);
			});

			expect(mockTriggerHaptic).toHaveBeenCalledTimes(1);
		});

		it("does not fire when the pull stays below the threshold", () => {
			render(<PullToRefresh />);

			act(() => {
				dispatchTouch("touchstart", 0);
				dispatchTouch("touchmove", 30);
				dispatchTouch("touchend", 30);
			});

			expect(mockTriggerHaptic).not.toHaveBeenCalled();
		});
	});

	describe("opt-out (gesture conflicts)", () => {
		beforeEach(() => {
			mockUseIsTouchDevice.mockReturnValue(true);
		});

		/**
		 * @regression ptr-disarmed-under-open-overlay
		 * Un Sheet/Drawer Vaul verrouille le scroll du body : `window.scrollY` reste 0
		 * alors que l'utilisateur manipule l'overlay. Le geste s'armait donc DERRIÈRE
		 * lui — un drag vers le bas dans un panier ouvert déclenchait un
		 * rafraîchissement de la page sous la modale.
		 */
		it("does not arm while an overlay is open", () => {
			render(<PullToRefresh />);
			act(() => {
				useOverlayStackStore.setState({ count: 1 });
			});

			act(() => pullPastThreshold());

			expect(mockTriggerHaptic).not.toHaveBeenCalled();
		});

		it("re-arms once the overlay closes", () => {
			render(<PullToRefresh />);
			act(() => {
				useOverlayStackStore.setState({ count: 1 });
			});
			act(() => pullPastThreshold());
			expect(mockTriggerHaptic).not.toHaveBeenCalled();

			act(() => {
				useOverlayStackStore.setState({ count: 0 });
			});
			act(() => pullPastThreshold());

			expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
		});

		/**
		 * @regression ptr-data-no-ptr-optout
		 * Échappatoire pour les surfaces en `position: fixed` qui ne passent pas par
		 * le store overlay (lightbox, image zoomée) : `scrollY` y vaut 0 aussi.
		 */
		it("does not arm inside a [data-no-ptr] subtree", () => {
			const host = document.createElement("div");
			host.setAttribute("data-no-ptr", "");
			const child = document.createElement("span");
			host.appendChild(child);
			document.body.appendChild(host);

			render(<PullToRefresh />);
			act(() => pullPastThreshold(child));

			expect(mockTriggerHaptic).not.toHaveBeenCalled();
			document.body.removeChild(host);
		});
	});

	describe("page refresh handlers", () => {
		beforeEach(() => {
			mockUseIsTouchDevice.mockReturnValue(true);
		});

		it("dispatches the page-handler event when the gesture fires", () => {
			const listener = vi.fn();
			window.addEventListener(PULL_TO_REFRESH_EVENT, listener);
			render(<PullToRefresh />);

			act(() => pullPastThreshold());

			expect(listener).toHaveBeenCalledTimes(1);
			window.removeEventListener(PULL_TO_REFRESH_EVENT, listener);
		});

		/**
		 * @regression ptr-no-dead-timeout-wait
		 * `pageHandler` ne se résolvait que par le timeout de 1500 ms quand aucune
		 * page n'écoutait — et AUCUNE ne le faisait dans tout le repo. Chaque tirage
		 * brûlait donc 1,5 s avant `router.refresh()`. Sans handler, on n'attend plus.
		 */
		it("refreshes without waiting for the handler timeout when nobody listens", async () => {
			const refresh = vi.fn();
			mockUseRouter.mockReturnValue({ refresh });
			vi.useFakeTimers();
			render(<PullToRefresh />);

			act(() => pullPastThreshold());
			// Seul le délai minimal d'affichage du spinner (400 ms) sépare le geste du
			// refresh — pas les 1500 ms du timeout de handler.
			await act(async () => {
				await vi.advanceTimersByTimeAsync(400);
			});

			expect(refresh).toHaveBeenCalledTimes(1);
			vi.useRealTimers();
		});

		it("awaits a handler promise registered via waitFor before refreshing", async () => {
			const refresh = vi.fn();
			mockUseRouter.mockReturnValue({ refresh });
			let resolveHandler: () => void = () => {};
			const listener = (event: Event) => {
				(event as CustomEvent<{ waitFor: (p: Promise<unknown>) => void }>).detail.waitFor(
					new Promise<void>((resolve) => {
						resolveHandler = resolve;
					}),
				);
			};
			window.addEventListener(PULL_TO_REFRESH_EVENT, listener);
			vi.useFakeTimers();
			render(<PullToRefresh />);

			act(() => pullPastThreshold());
			await act(async () => {
				await vi.advanceTimersByTimeAsync(400);
			});
			expect(refresh).not.toHaveBeenCalled();

			await act(async () => {
				resolveHandler();
			});

			expect(refresh).toHaveBeenCalledTimes(1);
			window.removeEventListener(PULL_TO_REFRESH_EVENT, listener);
			vi.useRealTimers();
		});
	});
});

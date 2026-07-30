import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createRef, type RefObject } from "react";

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { useBottomBarHeight, _registry } from "../use-bottom-bar-height";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCssVar(): string {
	return document.documentElement.style.getPropertyValue("--bottom-bar-height");
}

/**
 * Élément détaché avec un `offsetHeight` forcé.
 *
 * jsdom ne fait aucun layout : `offsetHeight` y vaut toujours 0. La hauteur doit
 * donc être posée explicitement pour exercer le chemin de mesure — sans ça les
 * tests ne verraient que le repli et le passage prop → mesure serait invisible.
 */
function refWithHeight(offsetHeight: number): RefObject<HTMLElement | null> {
	const el = document.createElement("div");
	Object.defineProperty(el, "offsetHeight", { value: offsetHeight, configurable: true });
	const ref = createRef<HTMLElement>();
	ref.current = el;
	return ref;
}

/** Ref sans élément monté : le hook doit retomber sur le `fallback`. */
function emptyRef(): RefObject<HTMLElement | null> {
	return createRef<HTMLElement>();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useBottomBarHeight", () => {
	beforeEach(() => {
		// Clear the shared registry and CSS var before each test
		_registry.clear();
		document.documentElement.style.removeProperty("--bottom-bar-height");
	});

	afterEach(() => {
		_registry.clear();
		document.documentElement.style.removeProperty("--bottom-bar-height");
	});

	// -------------------------------------------------------------------------
	// Mesure vs repli
	// -------------------------------------------------------------------------

	describe("mesure de l'élément", () => {
		it("publie la hauteur MESURÉE, pas le repli", () => {
			const ref = refWithHeight(90);
			renderHook(() => useBottomBarHeight(ref, { fallback: 56 }));
			expect(getCssVar()).toBe("90px");
		});

		// Le cœur du P1 : `h-14` suit la police racine, un littéral px non. À 200 %
		// la barre mesure 112px — la variable doit suivre, sinon tout le contenu
		// réservé en dessous passe derrière la barre.
		it("suit une hauteur doublée par la police racine (200 %)", () => {
			const ref = refWithHeight(112);
			renderHook(() => useBottomBarHeight(ref, { fallback: 56 }));
			expect(getCssVar()).toBe("112px");
		});

		it("retombe sur le repli quand l'élément n'est pas monté", () => {
			renderHook(() => useBottomBarHeight(emptyRef(), { fallback: 56 }));
			expect(getCssVar()).toBe("56px");
		});

		// Au moment où la barre devient visible, la media query CSS et la
		// `matchMedia` JS peuvent encore diverger d'une fraction de px : une mesure
		// à 0 ne doit JAMAIS être publiée telle quelle, sinon les consommateurs
		// collent leur contenu sous une barre bien présente.
		it("retombe sur le repli quand la mesure vaut 0", () => {
			const ref = refWithHeight(0);
			renderHook(() => useBottomBarHeight(ref, { fallback: 56 }));
			expect(getCssVar()).toBe("56px");
		});

		it("observe l'élément pour suivre les changements de boîte", () => {
			const observe = vi.fn();
			const disconnect = vi.fn();
			const original = globalThis.ResizeObserver;
			globalThis.ResizeObserver = class {
				observe = observe;
				unobserve = vi.fn();
				disconnect = disconnect;
			} as unknown as typeof ResizeObserver;

			const ref = refWithHeight(90);
			const { unmount } = renderHook(() => useBottomBarHeight(ref, { fallback: 56 }));
			expect(observe).toHaveBeenCalledWith(ref.current);

			unmount();
			expect(disconnect).toHaveBeenCalled();

			globalThis.ResizeObserver = original;
		});
	});

	// -------------------------------------------------------------------------
	// CSS var management
	// -------------------------------------------------------------------------

	describe("CSS variable management", () => {
		it("sets --bottom-bar-height on root when enabled", () => {
			renderHook(() => useBottomBarHeight(refWithHeight(60), { fallback: 56 }));
			expect(getCssVar()).toBe("60px");
		});

		it("removes --bottom-bar-height on unmount", () => {
			const { unmount } = renderHook(() => useBottomBarHeight(refWithHeight(60), { fallback: 56 }));
			expect(getCssVar()).toBe("60px");

			unmount();

			expect(getCssVar()).toBe("");
		});

		it("does not set the CSS var when enabled=false", () => {
			renderHook(() => useBottomBarHeight(refWithHeight(60), { fallback: 56, enabled: false }));
			expect(getCssVar()).toBe("");
		});

		it("removes the registry entry when enabled transitions to false", () => {
			const ref = refWithHeight(60);
			let enabled = true;
			const { rerender } = renderHook(() => useBottomBarHeight(ref, { fallback: 56, enabled }));
			expect(getCssVar()).toBe("60px");

			enabled = false;
			rerender();

			expect(getCssVar()).toBe("");
		});

		it("restores the CSS var when enabled transitions back to true", () => {
			const ref = refWithHeight(60);
			let enabled = true;
			const { rerender } = renderHook(() => useBottomBarHeight(ref, { fallback: 56, enabled }));

			enabled = false;
			rerender();
			expect(getCssVar()).toBe("");

			enabled = true;
			rerender();
			expect(getCssVar()).toBe("60px");
		});
	});

	// -------------------------------------------------------------------------
	// Multiple bars — max height logic
	// -------------------------------------------------------------------------

	describe("multiple bars use max height", () => {
		it("uses the max height when two bars are registered", () => {
			renderHook(() => useBottomBarHeight(refWithHeight(40), { fallback: 56 }));
			renderHook(() => useBottomBarHeight(refWithHeight(80), { fallback: 56 }));

			expect(getCssVar()).toBe("80px");
		});

		it("falls back to the remaining bar height after one unmounts", () => {
			const { unmount: unmountFirst } = renderHook(() =>
				useBottomBarHeight(refWithHeight(40), { fallback: 56 }),
			);
			renderHook(() => useBottomBarHeight(refWithHeight(80), { fallback: 56 }));

			expect(getCssVar()).toBe("80px");

			unmountFirst();

			expect(getCssVar()).toBe("80px");
		});

		it("removes CSS var when all bars unmount", () => {
			const { unmount: unmountFirst } = renderHook(() =>
				useBottomBarHeight(refWithHeight(40), { fallback: 56 }),
			);
			const { unmount: unmountSecond } = renderHook(() =>
				useBottomBarHeight(refWithHeight(80), { fallback: 56 }),
			);

			unmountFirst();
			unmountSecond();

			expect(getCssVar()).toBe("");
		});
	});

	// -------------------------------------------------------------------------
	// Registry tracking
	// -------------------------------------------------------------------------

	describe("_registry", () => {
		it("registers exactly one entry per hook instance", () => {
			const sizeBefore = _registry.size;
			renderHook(() => useBottomBarHeight(refWithHeight(50), { fallback: 56 }));
			expect(_registry.size).toBe(sizeBefore + 1);
		});

		it("removes the entry from the registry on unmount", () => {
			const { unmount } = renderHook(() => useBottomBarHeight(refWithHeight(50), { fallback: 56 }));
			const sizeAfterMount = _registry.size;

			unmount();

			expect(_registry.size).toBe(sizeAfterMount - 1);
		});
	});
});

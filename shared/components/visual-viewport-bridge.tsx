"use client";

import { useSyncExternalStore } from "react";

/**
 * Threshold (px) below which a shrunk visualViewport is considered the
 * soft-keyboard being open on iOS/Android. 100px empiriquement suffisant
 * pour distinguer URL bar collapse (~60px) d'un clavier (~250-350px).
 */
const KEYBOARD_THRESHOLD_PX = 100;

type VisualViewportState = {
	height: number;
	offsetTop: number;
	keyboardOpen: boolean;
};

const DEFAULT_STATE: VisualViewportState = {
	height: 0,
	offsetTop: 0,
	keyboardOpen: false,
};

let currentState: VisualViewportState = DEFAULT_STATE;
const listeners = new Set<() => void>();
let installed = false;

function readState(): VisualViewportState {
	if (typeof window === "undefined" || !window.visualViewport) return DEFAULT_STATE;
	const vv = window.visualViewport;
	const windowHeight = window.innerHeight;
	const keyboardOpen = windowHeight - vv.height > KEYBOARD_THRESHOLD_PX;
	return {
		height: vv.height,
		offsetTop: vv.offsetTop,
		keyboardOpen,
	};
}

function applySideEffects(state: VisualViewportState) {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	// `--vvh-offset` (visualViewport.offsetTop) a été retiré : écrit à chaque
	// resize/scroll, il n'avait aucun lecteur dans tout le repo. `offsetTop` reste
	// exposé dans l'état du store pour `useKeyboardOpen` et un usage JS futur.
	if (state.height > 0) {
		root.style.setProperty("--vvh", `${state.height}px`);
	}
	if (state.keyboardOpen) {
		root.setAttribute("data-keyboard", "open");
	} else {
		root.removeAttribute("data-keyboard");
	}
}

function update() {
	const next = readState();
	if (
		next.height === currentState.height &&
		next.offsetTop === currentState.offsetTop &&
		next.keyboardOpen === currentState.keyboardOpen
	) {
		return;
	}
	currentState = next;
	applySideEffects(next);
	for (const listener of listeners) listener();
}

function install() {
	if (installed || typeof window === "undefined" || !window.visualViewport) return;
	installed = true;
	const vv = window.visualViewport;
	vv.addEventListener("resize", update, { passive: true });
	vv.addEventListener("scroll", update, { passive: true });
	currentState = readState();
	applySideEffects(currentState);
}

function subscribe(listener: () => void): () => void {
	install();
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot() {
	return currentState;
}

function getServerSnapshot() {
	return DEFAULT_STATE;
}

/**
 * Pure side-effect mount observing `window.visualViewport`.
 *
 * Monté **une seule fois, dans `app/layout.tsx`** (racine applicative) : le
 * listener s'installe sur `window.visualViewport` et maintient la var CSS
 * `--vvh` + l'attribut `[data-keyboard]` sur `<html>`. Ne rend rien.
 *
 * ⚠️ Ne PAS le monter par route-group. Historiquement il ne vivait que dans
 * `(shop)` et `admin`, ce qui laissait `/paiement` (segment **frère** de
 * `(shop)`, pas enfant), `(auth)`, `(account)` et `/suivi-commande` sans
 * `[data-keyboard]` — donc `data-hide-on-keyboard` inerte sur toute la route
 * checkout, là où il est le plus critique. Verrouillé par
 * `__tests__/visual-viewport-bridge-root-mount.regression.test.ts`.
 *
 * Consumers can react via CSS (`[data-keyboard="open"] ...`) without
 * subscribing to the hook — useful for fixed bars that should hide under
 * the keyboard.
 */
export function VisualViewportBridge() {
	useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	return null;
}

/**
 * Réactif : `true` quand le clavier mobile est ouvert (visualViewport rétréci
 * au-delà de {@link KEYBOARD_THRESHOLD_PX}).
 *
 * À utiliser quand un composant **animé inline** (Framer Motion) doit se masquer
 * sous le clavier : son `transform` inline écrase la règle CSS
 * `[data-keyboard="open"] [data-hide-on-keyboard]`, donc l'attribut CSS seul ne
 * suffit pas — il faut plier `keyboardOpen` dans la cible d'animation.
 *
 * SSR / pas de support visualViewport → `false`. Nécessite que
 * {@link VisualViewportBridge} soit monté à la racine de la surface.
 */
export function useKeyboardOpen(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => getSnapshot().keyboardOpen,
		() => false,
	);
}

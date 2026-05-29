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
	if (state.height > 0) {
		root.style.setProperty("--vvh", `${state.height}px`);
		root.style.setProperty("--vvh-offset", `${state.offsetTop}px`);
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
 * Mount once at the root of a client surface (admin layout) so the listener
 * installs on `window.visualViewport` and maintains the `--vvh` CSS var +
 * `[data-keyboard]` attribute on `<html>`. Renders nothing.
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

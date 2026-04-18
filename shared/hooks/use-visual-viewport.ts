"use client";

import { useSyncExternalStore } from "react";

/**
 * Threshold (px) below which a shrunk visualViewport is considered the
 * soft-keyboard being open on iOS/Android. 100px empiriquement suffisant
 * pour distinguer URL bar collapse (~60px) d'un clavier (~250-350px).
 */
const KEYBOARD_THRESHOLD_PX = 100;

export type VisualViewportState = {
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
	vv.addEventListener("resize", update);
	vv.addEventListener("scroll", update);
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

/**
 * Observes `window.visualViewport` and exposes keyboard-open state.
 *
 * Side effects on `<html>`:
 * - CSS variables `--vvh` (visual viewport height in px) and `--vvh-offset`
 * - `data-keyboard="open"` attribute when a soft keyboard is detected
 *
 * Consumers can react via CSS (`[data-keyboard="open"] ...`) without
 * subscribing to the hook — useful for fixed bars that should hide under
 * the keyboard. Mount once at the root (e.g. admin layout) via a bridge
 * client component.
 */
export function useVisualViewport(): VisualViewportState {
	return useSyncExternalStore(
		subscribe,
		() => currentState,
		() => DEFAULT_STATE,
	);
}

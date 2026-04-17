"use client";

/**
 * Haptic feedback patterns (Vibration API).
 *
 * Usage:
 *   const haptic = useHaptic();
 *   haptic("light");   // ajout panier, toggle
 *   haptic("medium");  // validation, swipe-to-delete
 *   haptic("heavy");   // succès checkout, confirmation
 *   haptic("error");   // erreur validation
 *   haptic("success"); // succès commande
 *
 * Respecte prefers-reduced-motion et désactive sur devices non-touch.
 * La Vibration API n'est supportée que sur Android / PWA — iOS Safari l'ignore
 * silencieusement (retourne false). Pas de bruit, pas d'erreur.
 */

export type HapticPattern = "light" | "medium" | "heavy" | "error" | "success" | "selection";

const PATTERNS: Record<HapticPattern, number | number[]> = {
	selection: 5,
	light: 10,
	medium: 20,
	heavy: 40,
	error: [30, 50, 30],
	success: [10, 30, 10],
};

function prefersReducedMotion(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function canVibrate(): boolean {
	if (typeof window === "undefined") return false;
	if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
	if (prefersReducedMotion()) return false;
	return true;
}

/**
 * Trigger haptic feedback with a named pattern.
 * No-op when unsupported, reduced motion, or SSR.
 * Returns true if the vibration was triggered.
 */
export function triggerHaptic(pattern: HapticPattern = "light"): boolean {
	if (!canVibrate()) return false;
	try {
		return navigator.vibrate(PATTERNS[pattern]);
	} catch {
		return false;
	}
}

/**
 * Hook returning a stable haptic trigger function.
 * Safe to call during render — the returned function checks support lazily.
 */
export function useHaptic() {
	return triggerHaptic;
}

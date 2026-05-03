"use client";

/**
 * Haptic feedback patterns (Vibration API).
 *
 * Sémantique 2026 (Apple HIG + Material 3) :
 *   - selection (5ms)         → changement d'état UI passif (tab, picker, filtre toggle)
 *   - light     (10ms)        → micro-action confirmée (bouton appuyé, toggle, ajout panier)
 *   - medium    (20ms)        → action intentionnelle confirmée (form submit, swipe-to-delete threshold, drawer apply)
 *   - heavy     (40ms)        → action critique/irréversible (delete final, payment confirm)
 *   - success   ([10,30,10])  → notification d'outcome favorable (commande passée, paiement OK)
 *   - error     ([30,50,30])  → notification d'échec/blocage (validation form, paiement refusé)
 *
 * Usage :
 *   const haptic = useHaptic();
 *   haptic("light");
 *
 * Garanties :
 *   - Respecte `prefers-reduced-motion` (no-op si reduce).
 *   - SSR-safe (no-op côté serveur).
 *   - iOS Safari : `navigator.vibrate` non supporté → no-op silencieux.
 *   - Cooldown 80ms anti-cascade : 2 appels rapprochés = 1 vibration unique
 *     (évite le ressenti "buzzy" Material 3 sur enchaînements apply→close).
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

const COOLDOWN_MS = 80;

let lastTriggerAt = 0;

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
 * No-op when unsupported, reduced motion, SSR, or within 80ms of a previous trigger.
 * Returns true if the vibration was actually triggered.
 */
export function triggerHaptic(pattern: HapticPattern = "light"): boolean {
	if (!canVibrate()) return false;

	const now = Date.now();
	if (now - lastTriggerAt < COOLDOWN_MS) return false;

	try {
		const result = navigator.vibrate(PATTERNS[pattern]);
		if (result) lastTriggerAt = now;
		return result;
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

/**
 * @internal Test-only — reset cooldown timestamp between tests.
 * Not exported via public hook surface.
 */
export function __resetHapticCooldown(): void {
	lastTriggerAt = 0;
}

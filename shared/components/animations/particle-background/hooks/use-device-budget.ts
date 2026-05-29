"use client";

import { useSyncExternalStore } from "react";

/** Type augmentation pour les APIs non standard (deviceMemory, connection.saveData) */
type NavigatorWithBudgetHints = Navigator & {
	deviceMemory?: number;
	connection?: { saveData?: boolean };
};

/**
 * Calcule un facteur de budget de rendu (0.3–1) à partir des capacités de l'appareil.
 *
 * - `Save-Data` / `prefers-reduced-data: reduce` → budget minimal (0.3).
 * - `navigator.deviceMemory` faible (≤2/4/6 Go) et `hardwareConcurrency` faible (≤2/4 cœurs)
 *   réduisent progressivement le facteur.
 *
 * Les capacités sont prises au minimum (le device le plus contraint l'emporte).
 * Retourne 1 si aucune information n'est disponible (desktop moderne par défaut).
 */
export function computeDeviceBudget(): number {
	if (typeof navigator === "undefined") return 1;

	const nav = navigator as NavigatorWithBudgetHints;

	const reducedData =
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-data: reduce)").matches;

	if (reducedData || nav.connection?.saveData === true) return 0.3;

	let factor = 1;

	const mem = nav.deviceMemory;
	if (typeof mem === "number") {
		if (mem <= 2) factor = Math.min(factor, 0.4);
		else if (mem <= 4) factor = Math.min(factor, 0.6);
		else if (mem <= 6) factor = Math.min(factor, 0.8);
	}

	const cores = nav.hardwareConcurrency;
	if (typeof cores === "number") {
		if (cores <= 2) factor = Math.min(factor, 0.4);
		else if (cores <= 4) factor = Math.min(factor, 0.6);
	}

	return factor;
}

/**
 * Budget de rendu adaptatif (0.3–1) selon les capacités device.
 *
 * SSR-safe : retourne 1 côté serveur et au premier rendu client (snapshot serveur),
 * puis se réévalue une fois monté. Les capacités matérielles ne changeant pas à l'exécution,
 * aucun abonnement n'est nécessaire (snapshot stable par valeur).
 *
 * @param enabled - si `false`, retourne toujours 1 (désactive l'adaptativité)
 */
export function useDeviceBudget(enabled = true): number {
	return useSyncExternalStore(
		() => () => {},
		() => (enabled ? computeDeviceBudget() : 1),
		() => 1,
	);
}

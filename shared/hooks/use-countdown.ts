"use client";

import { useSyncExternalStore } from "react";

const MINUTE_MS = 60_000;

/**
 * Le « store externe » d'un compte à rebours, c'est l'horloge. On s'y abonne au
 * lieu de forcer un re-rendu via un `useState` dont la valeur n'était jamais lue
 * (`const [, setTick]`) : `useSyncExternalStore` est la primitive faite pour ça,
 * et c'est déjà celle de `use-media-query` / `use-mobile` / `use-touch-device`.
 *
 * L'instantané est le NUMÉRO DE MINUTE, pas l'objet `CountdownSnapshot` : React
 * exige de `getSnapshot` une valeur `Object.is`-stable tant que rien n'a changé,
 * or un objet frais à chaque appel ferait boucler le rendu à l'infini.
 */
function subscribeToMinuteTick(onStoreChange: () => void) {
	const interval = setInterval(onStoreChange, MINUTE_MS);
	return () => clearInterval(interval);
}

/** Pas de date cible : aucun timer à armer. */
function subscribeToNothing() {
	return () => {};
}

const getMinuteBucket = () => Math.floor(Date.now() / MINUTE_MS);
const getServerMinuteBucket = () => 0;

/**
 * Remaining time breakdown; `isExpired` fires when `target <= now`.
 */
export interface CountdownSnapshot {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	totalMs: number;
	isExpired: boolean;
}

function computeSnapshot(target: number): CountdownSnapshot {
	const totalMs = Math.max(0, target - Date.now());
	const totalSeconds = Math.floor(totalMs / 1000);
	const days = Math.floor(totalSeconds / (60 * 60 * 24));
	const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
	const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
	const seconds = totalSeconds % 60;
	return { days, hours, minutes, seconds, totalMs, isExpired: totalMs === 0 };
}

function parseTarget(endDate: Date | string | null | undefined): number | null {
	if (!endDate) return null;
	const t = new Date(endDate).getTime();
	return Number.isNaN(t) ? null : t;
}

/**
 * Countdown hook ticking every minute (no sub-minute precision — cheap, battery-friendly,
 * and acceptable for "fin de l'offre dans 23h 14min"-style UIs).
 *
 * Returns a fresh {@link CountdownSnapshot} each minute until expiry.
 *
 * @param endDate — the target moment (Date or ISO string). `null`/`undefined` disables the timer.
 */
export function useCountdown(endDate: Date | string | null | undefined): CountdownSnapshot | null {
	const target = parseTarget(endDate);

	// Le tic sert de SIGNAL de changement ; le temps restant reste calculé sur
	// `Date.now()` pour garder la précision entre deux tics.
	useSyncExternalStore(
		target === null ? subscribeToNothing : subscribeToMinuteTick,
		getMinuteBucket,
		getServerMinuteBucket,
	);

	return target === null ? null : computeSnapshot(target);
}

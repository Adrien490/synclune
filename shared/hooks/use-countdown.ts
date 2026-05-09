"use client";

import { useEffect, useState } from "react";

const MINUTE_MS = 60_000;

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
	const snapshot = target === null ? null : computeSnapshot(target);
	const [, setTick] = useState(0);

	useEffect(() => {
		if (target === null) return;
		if (Date.now() >= target) return;
		const interval = setInterval(() => {
			if (Date.now() >= target) {
				clearInterval(interval);
			}
			setTick((t) => t + 1);
		}, MINUTE_MS);
		return () => clearInterval(interval);
	}, [target]);

	return snapshot;
}

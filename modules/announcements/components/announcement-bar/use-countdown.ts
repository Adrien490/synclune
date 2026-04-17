"use client";

import { useEffect, useState } from "react";

interface CountdownLabel {
	/** Formatted "HH:MM:SS" or "MM:SS" string ready for display */
	label: string;
	/** Remaining milliseconds until target */
	remainingMs: number;
}

function formatRemaining(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const pad = (n: number) => String(n).padStart(2, "0");

	if (hours > 0) {
		return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
	}
	return `${pad(minutes)}:${pad(seconds)}`;
}

function resolveTargetMs(target: Date | string | null | undefined): number | null {
	if (!target) return null;
	const ms = new Date(target).getTime();
	return Number.isNaN(ms) ? null : ms;
}

/**
 * Returns a live countdown label when `target` is within `displayThresholdMs`
 * from now. Returns `null` otherwise (no target, target passed, or too far).
 *
 * - Ticks every second while visible
 * - SSR-safe (returns null until first effect runs)
 * - Auto-stops once target is reached
 */
export function useCountdown(
	target: Date | string | null | undefined,
	displayThresholdMs: number,
): CountdownLabel | null {
	const targetMs = resolveTargetMs(target);
	const [now, setNow] = useState<number | null>(null);

	useEffect(() => {
		if (targetMs === null) return;

		const tick = () => setNow(Date.now());
		tick();
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, [targetMs]);

	if (targetMs === null || now === null) return null;

	const remainingMs = targetMs - now;
	if (remainingMs <= 0 || remainingMs > displayThresholdMs) return null;

	return { label: formatRemaining(remainingMs), remainingMs };
}

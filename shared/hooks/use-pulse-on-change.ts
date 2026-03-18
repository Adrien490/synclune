"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function subscribePrefersReducedMotion(callback: () => void) {
	const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
	mql.addEventListener("change", callback);
	return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
	return false;
}

/**
 * Hook that returns true briefly when the value changes.
 * Useful for triggering a pulse animation on badges.
 *
 * @param value - The value to watch for changes
 * @param duration - Pulse duration in ms (default: 600ms)
 * @returns true if currently in the pulse period
 */
export function usePulseOnChange<T>(value: T, duration = 600): boolean {
	const [shouldPulse, setShouldPulse] = useState(false);
	const [pulseKey, setPulseKey] = useState(0);
	const prefersReducedMotion = useSyncExternalStore(
		subscribePrefersReducedMotion,
		getReducedMotionSnapshot,
		getReducedMotionServerSnapshot,
	);

	// Render-time state adjustment: detect value changes (React-recommended pattern)
	const [prevValue, setPrevValue] = useState(value);
	if (prevValue !== value) {
		setPrevValue(value);
		if (!prefersReducedMotion) {
			setShouldPulse(true);
			setPulseKey(pulseKey + 1);
		}
	}

	// Reset pulse after duration (pulseKey restarts timer on mid-pulse changes)
	useEffect(() => {
		if (!shouldPulse) return;
		const timeout = setTimeout(() => setShouldPulse(false), duration);
		return () => clearTimeout(timeout);
	}, [shouldPulse, pulseKey, duration]);

	return shouldPulse;
}

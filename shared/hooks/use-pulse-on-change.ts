"use client";

import { useEffect, useState } from "react";

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

	// Render-time state adjustment: detect value changes without useEffect
	const [prevValue, setPrevValue] = useState(value);
	if (prevValue !== value) {
		setPrevValue(value);
		setShouldPulse(true);
		setPulseKey(pulseKey + 1);
	}

	// Reset pulse after duration (pulseKey restarts the timer on mid-pulse changes)
	useEffect(() => {
		if (!shouldPulse) return;
		const timeout = setTimeout(() => setShouldPulse(false), duration);
		return () => clearTimeout(timeout);
	}, [shouldPulse, pulseKey, duration]);

	return shouldPulse;
}

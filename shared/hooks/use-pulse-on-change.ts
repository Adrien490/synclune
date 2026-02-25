"use client";

import { useEffect, useRef, useState } from "react";

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
	const prevValueRef = useRef(value);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		if (prevValueRef.current === value) {
			return;
		}

		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		setShouldPulse(true);
		prevValueRef.current = value;

		timeoutRef.current = setTimeout(() => {
			setShouldPulse(false);
		}, duration);

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [value, duration]);

	return shouldPulse;
}

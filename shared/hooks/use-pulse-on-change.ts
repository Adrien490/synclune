"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook qui retourne true brievement quand la valeur change
 * Utile pour declencher une animation de pulse sur les badges
 *
 * @param value - La valeur a surveiller
 * @param duration - Duree du pulse en ms (defaut: 600ms)
 * @returns true si on est dans la periode de pulse
 */
export function usePulseOnChange(value: number, duration = 600): boolean {
	const [shouldPulse, setShouldPulse] = useState(false);
	const prevValueRef = useRef(value);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		// Ne pas pulser au premier rendu ou si la valeur n'a pas change
		if (prevValueRef.current === value) {
			return;
		}

		// Nettoyer le timeout precedent
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		// Declencher le pulse
		setShouldPulse(true);
		prevValueRef.current = value;

		// Arreter le pulse apres la duree
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

"use client";

import { useRef } from "react";

interface UseLongPressOptions {
	threshold?: number;
	onStart?: () => void;
	onCancel?: () => void;
}

interface UseLongPressResult {
	onPointerDown: (e: React.PointerEvent) => void;
	onPointerUp: () => void;
	onPointerLeave: () => void;
	onPointerCancel: () => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
	onKeyUp: (e: React.KeyboardEvent) => void;
}

/**
 * Hook pour détecter les interactions de pression longue (long-press)
 * Compatible souris, tactile via Pointer Events, et clavier (Espace/Entrée)
 *
 * @param callback - Fonction appelée après le délai de pression
 * @param options.threshold - Délai en ms avant déclenchement (défaut: 500ms)
 * @param options.onStart - Callback au début de la pression
 * @param options.onCancel - Callback si pression annulée
 * @returns Handlers à spread sur l'élément cible
 *
 * @example
 * const longPressProps = useLongPress(() => console.log("Long press!"), { threshold: 400 });
 * <button {...longPressProps}>Maintenir</button>
 */
export function useLongPress(
	callback: () => void,
	options: UseLongPressOptions = {}
): UseLongPressResult {
	const { threshold = 500, onStart, onCancel } = options;
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isLongPressRef = useRef(false);

	const start = (e: React.PointerEvent) => {
		// Empêche le menu contextuel sur mobile
		e.preventDefault();

		isLongPressRef.current = false;
		onStart?.();

		timeoutRef.current = setTimeout(() => {
			isLongPressRef.current = true;
			callback();
		}, threshold);
	};

	const cancel = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;

			if (!isLongPressRef.current) {
				onCancel?.();
			}
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		// Support clavier : Espace ou Entrée pour accessibilité
		if (e.code !== "Space" && e.code !== "Enter") return;
		if (e.repeat) return; // Évite les répétitions
		e.preventDefault();

		isLongPressRef.current = false;
		onStart?.();

		timeoutRef.current = setTimeout(() => {
			isLongPressRef.current = true;
			callback();
		}, threshold);
	};

	const handleKeyUp = (e: React.KeyboardEvent) => {
		if (e.code !== "Space" && e.code !== "Enter") return;
		e.preventDefault();
		cancel();
	};

	return {
		onPointerDown: start,
		onPointerUp: cancel,
		onPointerLeave: cancel,
		onPointerCancel: cancel,
		onKeyDown: handleKeyDown,
		onKeyUp: handleKeyUp,
	};
}

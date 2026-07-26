"use client";

import { useEffect, useEffectEvent } from "react";

/**
 * Listener clavier `Escape` au niveau document, conditionnel.
 *
 * Utile pour fermer un mode (ex : sélection multiple, picker, drawer custom)
 * via clavier physique (iPad keyboard, laptop, accessibilité). Pour les modals
 * Radix/Vaul, l'Escape est déjà géré nativement — ne pas réutiliser ce hook.
 *
 * @param onEscape Callback déclenché à la frappe `Escape`.
 * @param enabled Quand `false`, le listener est démonté (pas d'appel inutile).
 *
 * @example
 * ```tsx
 * const { isOpen, close } = useDialog();
 * useEscapeKey(exitSelectionMode, selectionMode);
 * ```
 */
export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
	const onEscapeEvent = useEffectEvent(() => {
		onEscape();
	});

	useEffect(() => {
		if (!enabled) return;

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				event.preventDefault();
				onEscapeEvent();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [enabled]);
}

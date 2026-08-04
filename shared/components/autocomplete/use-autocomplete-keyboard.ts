import type React from "react";
import type { HapticPattern } from "@/shared/hooks/use-haptic";

interface UseAutocompleteKeyboardParams<T> {
	isOpen: boolean;
	hasValidQuery: boolean;
	hasResults: boolean;
	items: T[];
	activeIndex: number;
	setIsOpen: (open: boolean) => void;
	setActiveIndex: (index: number | ((prev: number) => number)) => void;
	onSelect: (item: T) => void;
	onHaptic?: (pattern: HapticPattern) => void;
}

export function useAutocompleteKeyboard<T>({
	isOpen,
	hasValidQuery,
	hasResults,
	items,
	activeIndex,
	setIsOpen,
	setActiveIndex,
	onSelect,
	onHaptic,
}: UseAutocompleteKeyboardParams<T>) {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!isOpen) {
			// Rouvre aussi sans résultats : le dropdown ré-affiche l'état applicable
			// (erreur + « Réessayer », état vide) — sinon, après Escape sur une
			// erreur, aucun moyen clavier de re-atteindre le retry.
			if (e.key === "ArrowDown" && hasValidQuery) {
				e.preventDefault();
				setIsOpen(true);
				setActiveIndex(hasResults ? 0 : -1);
			}
			return;
		}

		// Home/End volontairement NON interceptés : le pattern APG combobox les
		// réserve au curseur texte (aller au début/à la fin de la saisie).
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setActiveIndex((prev: number) => Math.min(prev + 1, items.length - 1));
				break;

			case "ArrowUp":
				e.preventDefault();
				setActiveIndex((prev: number) => Math.max(prev - 1, -1));
				break;

			case "Enter":
				if (activeIndex >= 0 && items[activeIndex]) {
					e.preventDefault();
					onSelect(items[activeIndex]);
					setIsOpen(false);
					setActiveIndex(-1);
				}
				break;

			case "Escape":
				e.preventDefault();
				setIsOpen(false);
				setActiveIndex(-1);
				onHaptic?.("light");
				break;

			case "Tab":
				setIsOpen(false);
				setActiveIndex(-1);
				break;

			default:
				break;
		}
	};

	return handleKeyDown;
}

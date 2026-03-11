import type React from "react";

interface UseAutocompleteKeyboardParams<T> {
	isOpen: boolean;
	hasValidQuery: boolean;
	hasResults: boolean;
	items: T[];
	activeIndex: number;
	setIsOpen: (open: boolean) => void;
	setActiveIndex: (index: number | ((prev: number) => number)) => void;
	onSelect: (item: T) => void;
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
}: UseAutocompleteKeyboardParams<T>) {
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (!isOpen) {
			if (e.key === "ArrowDown" && hasValidQuery && hasResults) {
				e.preventDefault();
				setIsOpen(true);
				setActiveIndex(0);
			}
			return;
		}

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setActiveIndex((prev: number) => Math.min(prev + 1, items.length - 1));
				break;

			case "ArrowUp":
				e.preventDefault();
				setActiveIndex((prev: number) => Math.max(prev - 1, -1));
				break;

			case "Home":
				e.preventDefault();
				setActiveIndex(0);
				break;

			case "End":
				e.preventDefault();
				setActiveIndex(items.length - 1);
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

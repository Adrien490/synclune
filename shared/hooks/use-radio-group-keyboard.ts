"use client";

import { useRef } from "react";

interface UseRadioGroupKeyboardOptions<T> {
	options: T[];
	getOptionId: (option: T) => string;
	isOptionDisabled?: (option: T) => boolean;
	onSelect: (option: T) => void;
}

/**
 * Hook pour la navigation clavier dans un radio group
 * Gère les flèches Haut/Bas/Gauche/Droite et Home/End selon WCAG 2.1
 */
export function useRadioGroupKeyboard<T>({
	options,
	getOptionId,
	isOptionDisabled = () => false,
	onSelect,
}: UseRadioGroupKeyboardOptions<T>) {
	const containerRef = useRef<HTMLDivElement>(null);

	const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
		const { key } = e;
		const optionsCount = options.length;

		// Navigation par flèches
		if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
			e.preventDefault();

			const direction = ["ArrowDown", "ArrowRight"].includes(key) ? 1 : -1;
			let nextIndex = currentIndex;
			let attempts = 0;

			do {
				nextIndex = (nextIndex + direction + optionsCount) % optionsCount;
				attempts++;
			} while (isOptionDisabled(options[nextIndex]) && attempts < optionsCount);

			if (attempts >= optionsCount) return;

			const nextOption = options[nextIndex];
			onSelect(nextOption);
			focusOption(nextOption);
			return;
		}

		// Navigation Home/End (WCAG 2.1)
		if (key === "Home" || key === "End") {
			e.preventDefault();

			const startIndex = key === "Home" ? 0 : optionsCount - 1;
			const direction = key === "Home" ? 1 : -1;
			let nextIndex = startIndex;
			let attempts = 0;

			// Trouver la première/dernière option non-disabled
			while (isOptionDisabled(options[nextIndex]) && attempts < optionsCount) {
				nextIndex = (nextIndex + direction + optionsCount) % optionsCount;
				attempts++;
			}

			if (attempts >= optionsCount) return;

			const nextOption = options[nextIndex];
			onSelect(nextOption);
			focusOption(nextOption);
		}
	};

	const focusOption = (option: T) => {
		const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>(
			'button[role="radio"]:not([disabled])'
		);
		if (buttons) {
			const targetButton = Array.from(buttons).find(
				(btn) => btn.getAttribute("data-option-id") === getOptionId(option)
			);
			targetButton?.focus();
		}
	};

	return { containerRef, handleKeyDown };
}

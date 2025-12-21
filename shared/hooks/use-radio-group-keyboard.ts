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
 * Gere les fleches Haut/Bas/Gauche/Droite selon WCAG
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

		if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
			return;
		}

		e.preventDefault();

		const direction = ["ArrowDown", "ArrowRight"].includes(key) ? 1 : -1;
		const optionsCount = options.length;

		// Trouver la prochaine option disponible
		let nextIndex = currentIndex;
		let attempts = 0;

		do {
			nextIndex = (nextIndex + direction + optionsCount) % optionsCount;
			attempts++;
		} while (isOptionDisabled(options[nextIndex]) && attempts < optionsCount);

		// Si toutes les options sont disabled, ne rien faire
		if (attempts >= optionsCount) return;

		const nextOption = options[nextIndex];
		onSelect(nextOption);

		// Focus sur le bouton suivant
		const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>(
			'button[role="radio"]:not([disabled])'
		);
		if (buttons) {
			const targetButton = Array.from(buttons).find(
				(btn) => btn.getAttribute("data-option-id") === getOptionId(nextOption)
			);
			targetButton?.focus();
		}
	};

	return { containerRef, handleKeyDown };
}

"use client";

import { useRef } from "react";

interface UseRadioGroupKeyboardOptions<T> {
	options: T[];
	getOptionId: (option: T) => string;
	isOptionDisabled?: (option: T) => boolean;
	onSelect: (option: T) => void;
	/**
	 * Id de l'option cochée, pour un **tabindex roving** (ARIA APG : un radiogroup
	 * est UN seul arrêt de tabulation). Omettre la prop laisse le comportement
	 * natif — chaque option reste un arrêt de tabulation, ce qui est le choix
	 * assumé du sélecteur de pièces du panier (`sku-selector-pieces.tsx`), où les
	 * options épuisées sont annoncées au TAB.
	 */
	activeOptionId?: string | null;
}

/**
 * Hook pour la navigation clavier dans un radio group
 * Gère les flèches Haut/Bas/Gauche/Droite et Home/End selon WCAG 2.1
 *
 * ## Options indisponibles : `aria-disabled`, pas `disabled`
 *
 * `focusOption` n'exclut de sa requête que `[disabled]` — un élément
 * `aria-disabled="true"` reste focusable, c'est précisément la raison d'être de
 * cet attribut plutôt que du `disabled` HTML (WCAG 1.3.1 : l'option doit pouvoir
 * être atteinte et annoncée « indisponible », seule l'ACTION est bloquée).
 *
 * Il excluait aussi `[aria-disabled="true"]`, ce qui produisait un cul-de-sac
 * silencieux : un appelant qui ne passait pas `isOptionDisabled` — pour « laisser
 * le focus traverser les options indisponibles », exactement ce que
 * `color-selector.tsx` déclarait faire — voyait la flèche cibler une option
 * absente de la requête, donc `target === undefined`, donc **le focus ne bougeait
 * pas du tout**. Le commentaire du nuancier décrivait l'inverse du comportement
 * réel (audit PDP 2026-08-05).
 *
 * Deux combinaisons cohérentes, au choix de l'appelant :
 * - **traversée** : pas de `isOptionDisabled`, les flèches atteignent les options
 *   épuisées et les font annoncer ; `activeOptionId` peut alors être passé pour
 *   n'avoir qu'un arrêt de tabulation ;
 * - **saut** : `isOptionDisabled` fourni, les flèches ignorent les options
 *   épuisées, qui restent atteignables au TAB (donc **sans** `activeOptionId`).
 */
export function useRadioGroupKeyboard<T>({
	options,
	getOptionId,
	isOptionDisabled = () => false,
	onSelect,
	activeOptionId,
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
			} while (isOptionDisabled(options[nextIndex]!) && attempts < optionsCount);

			if (attempts >= optionsCount) return;

			const nextOption = options[nextIndex];
			if (nextOption === undefined) return;
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
			while (isOptionDisabled(options[nextIndex]!) && attempts < optionsCount) {
				nextIndex = (nextIndex + direction + optionsCount) % optionsCount;
				attempts++;
			}

			if (attempts >= optionsCount) return;

			const nextOption = options[nextIndex];
			if (nextOption === undefined) return;
			onSelect(nextOption);
			focusOption(nextOption);
		}
	};

	const focusOption = (option: T) => {
		// `:not([disabled])` seul — cf. le bloc « Options indisponibles » du JSDoc.
		const elements = containerRef.current?.querySelectorAll<HTMLElement>(
			'[role="radio"]:not([disabled])',
		);
		if (elements) {
			const target = Array.from(elements).find(
				(el) => el.getAttribute("data-option-id") === getOptionId(option),
			);
			target?.focus();
		}
	};

	/**
	 * Tabindex roving. Inerte tant qu'`activeOptionId` n'est pas passé (renvoie
	 * `undefined`, donc l'appelant garde le tabindex naturel de ses éléments).
	 *
	 * ⚠️ Le repli sur la première option n'est pas cosmétique : un tabindex
	 * calculé sur la seule égalité `isSelected` faisait sortir TOUT le groupe de
	 * l'ordre de tabulation dès que la sélection courante disparaissait du
	 * catalogue (défaut constaté sur le sélecteur de pièces du panier).
	 */
	const getTabIndex = (option: T, index: number): 0 | -1 | undefined => {
		if (activeOptionId === undefined) return undefined;
		const activeExists =
			activeOptionId !== null && options.some((o) => getOptionId(o) === activeOptionId);
		if (activeExists) return getOptionId(option) === activeOptionId ? 0 : -1;
		return index === 0 ? 0 : -1;
	};

	return { containerRef, handleKeyDown, getTabIndex };
}

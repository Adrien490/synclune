"use client";

import { useState, type KeyboardEvent, type RefObject } from "react";

/**
 * Roving tabindex d'une `role="toolbar"` horizontale (flèches, Home/End) —
 * extrait du `ProductSortBar` avec la coque « tranche d'étagère ».
 *
 * L'anneau de navigation est dérivé des boutons RÉELLEMENT rendus : un bouton
 * masqué par un `md:hidden` est en `display: none`, donc non focusable, et
 * boucler sur un compte figé ferait une flèche morte à ce breakpoint.
 * `offsetParent` est `null` exactement dans ce cas — le gate se fait par
 * capacité, pas par une largeur re-dérivée en JS (SSOT breakpoints en rem).
 *
 * Usage : un tableau de refs stable dans l'ordre visuel, puis
 * `{...getRovingProps(i)}` sur chaque bouton (fournit `tabIndex`,
 * `onKeyDown`, `onFocus`).
 */
export function useToolbarRovingFocus(
	buttonRefs: ReadonlyArray<RefObject<HTMLButtonElement | null>>,
) {
	const [focusedIndex, setFocusedIndex] = useState(0);

	const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
		const visibleIndexes = buttonRefs
			.map((ref, index) => ({ ref, index }))
			.filter(({ ref }) => ref.current?.offsetParent != null)
			.map(({ index }) => index);

		if (visibleIndexes.length === 0) return;

		const position = visibleIndexes.indexOf(currentIndex);
		const count = visibleIndexes.length;
		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowRight":
			case "ArrowDown":
				e.preventDefault();
				nextIndex = visibleIndexes[(position + 1) % count]!;
				break;
			case "ArrowLeft":
			case "ArrowUp":
				e.preventDefault();
				nextIndex = visibleIndexes[(position - 1 + count) % count]!;
				break;
			case "Home":
				e.preventDefault();
				nextIndex = visibleIndexes[0]!;
				break;
			case "End":
				e.preventDefault();
				nextIndex = visibleIndexes[count - 1]!;
				break;
		}

		if (nextIndex !== null) {
			setFocusedIndex(nextIndex);
			buttonRefs[nextIndex]?.current?.focus();
		}
	};

	const getRovingProps = (index: number) => ({
		tabIndex: index === focusedIndex ? 0 : -1,
		onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => handleKeyDown(e, index),
		onFocus: () => setFocusedIndex(index),
	});

	return { getRovingProps };
}

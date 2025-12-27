"use client";

import { useEffect, useState, useRef } from "react";

/**
 * Hook optimisé pour détecter le scroll via IntersectionObserver
 *
 * Utilise IntersectionObserver au lieu de scroll events pour :
 * - Exécution sur le compositor thread (pas de blocking main thread)
 * - Ne se déclenche que lors du franchissement du seuil
 * - Meilleur INP (Interaction to Next Paint)
 *
 * @param threshold - Seuil de scroll en pixels (défaut: 10)
 * @returns true si scrollY > threshold
 */
export function useIsScrolled(threshold: number = 10): boolean {
	const [isScrolled, setIsScrolled] = useState(false);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		// Initial check synchrone pour éviter flash
		setIsScrolled(window.scrollY > threshold);

		// Créer un élément sentinel invisible en haut de la page
		const sentinel = document.createElement("div");
		sentinel.style.cssText = `
			position: absolute;
			top: ${threshold}px;
			left: 0;
			width: 1px;
			height: 1px;
			pointer-events: none;
		`;
		document.body.appendChild(sentinel);
		sentinelRef.current = sentinel;

		// Observer le sentinel - quand il sort du viewport, on a scrollé
		const observer = new IntersectionObserver(
			([entry]) => {
				// isIntersecting = false signifie qu'on a scrollé au-delà du threshold
				setIsScrolled(!entry.isIntersecting);
			},
			{
				threshold: 0,
				rootMargin: "0px",
			}
		);

		observer.observe(sentinel);

		return () => {
			observer.disconnect();
			sentinel.remove();
		};
	}, [threshold]);

	return isScrolled;
}

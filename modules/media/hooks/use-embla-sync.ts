import { useEffect, useRef } from "react";
import type { EmblaCarouselType } from "embla-carousel";

/**
 * Synchronisation bidirectionnelle entre Embla Carousel et l'index courant
 * - Embla → Index : quand l'utilisateur swipe
 * - Index → Embla : quand l'index change (thumbnails, clavier, URL)
 * - Utilise des refs stables pour eviter les race conditions
 */
export function useEmblaSync(
	emblaApi: EmblaCarouselType | undefined,
	currentIndex: number,
	onIndexChange: (index: number) => void
): void {
	// Refs stables pour eviter race conditions et recreations d'event listeners
	const currentIndexRef = useRef(currentIndex);
	const onIndexChangeRef = useRef(onIndexChange);
	currentIndexRef.current = currentIndex;
	onIndexChangeRef.current = onIndexChange;

	// Sync: Embla → Index (quand l'utilisateur swipe)
	useEffect(() => {
		if (!emblaApi) return;

		const onSelect = () => {
			const selectedIndex = emblaApi.selectedScrollSnap();
			// Validation null et comparaison avec ref stable
			if (selectedIndex !== null && selectedIndex !== undefined) {
				if (selectedIndex !== currentIndexRef.current) {
					onIndexChangeRef.current(selectedIndex);
				}
			}
		};

		emblaApi.on("select", onSelect);
		return () => {
			emblaApi.off("select", onSelect);
		};
	}, [emblaApi]); // Dependances minimales grace aux refs

	// Sync: Index → Embla (thumbnails, clavier, URL)
	useEffect(() => {
		if (!emblaApi) return;
		const selected = emblaApi.selectedScrollSnap();
		if (selected !== currentIndex && selected !== null) {
			emblaApi.scrollTo(currentIndex);
		}
	}, [emblaApi, currentIndex]);
}

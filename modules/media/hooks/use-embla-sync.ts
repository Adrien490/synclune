import { useEffect } from "react";
import type { EmblaCarouselType } from "embla-carousel";

/**
 * Synchronisation bidirectionnelle entre Embla Carousel et l'index courant
 * - Embla → Index : quand l'utilisateur swipe
 * - Index → Embla : quand l'index change (thumbnails, clavier, URL)
 */
export function useEmblaSync(
	emblaApi: EmblaCarouselType | undefined,
	currentIndex: number,
	onIndexChange: (index: number) => void
): void {
	// Sync: Embla → Index (quand l'utilisateur swipe)
	useEffect(() => {
		if (!emblaApi) return;

		const onSelect = (api: EmblaCarouselType) => {
			const index = api.selectedScrollSnap();
			if (index !== currentIndex) {
				onIndexChange(index);
			}
		};

		emblaApi.on("select", onSelect);
		return () => {
			emblaApi.off("select", onSelect);
		};
	}, [emblaApi, currentIndex, onIndexChange]);

	// Sync: Index → Embla (thumbnails, clavier, URL)
	useEffect(() => {
		if (!emblaApi) return;
		if (emblaApi.selectedScrollSnap() !== currentIndex) {
			emblaApi.scrollTo(currentIndex);
		}
	}, [emblaApi, currentIndex]);
}

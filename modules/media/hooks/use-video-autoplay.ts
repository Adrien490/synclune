import { useEffect, type RefObject } from "react";

/**
 * Gere le play/pause automatique des videos selon la slide active
 * - Joue la video de la slide active
 * - Met en pause et reset les autres videos
 * - Respecte prefers-reduced-motion (WCAG 2.3.3)
 */
export function useVideoAutoplay(
	containerRef: RefObject<HTMLDivElement | null>,
	activeIndex: number,
	prefersReducedMotion?: boolean | null
): void {
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// Respecter la preference utilisateur pour reduced motion
		if (prefersReducedMotion) return;

		const videos = container.querySelectorAll("video");
		videos.forEach((video) => {
			const slideIndex = Number(
				video.closest("[data-slide-index]")?.getAttribute("data-slide-index")
			);

			if (slideIndex === activeIndex) {
				if (video.readyState >= 2) {
					video.play().catch(() => {});
				} else {
					video.load();
					const handleCanPlay = () => {
						video.play().catch(() => {});
					};
					video.addEventListener("canplay", handleCanPlay, { once: true });
				}
			} else {
				video.pause();
				video.currentTime = 0;
			}
		});
	}, [activeIndex, containerRef]);
}

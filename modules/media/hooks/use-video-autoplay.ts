import { useEffect, type RefObject } from "react";

/**
 * Gère le play/pause automatique des vidéos selon la slide active
 * - Joue la vidéo de la slide active
 * - Met en pause et reset les autres vidéos
 */
export function useVideoAutoplay(
	containerRef: RefObject<HTMLDivElement | null>,
	activeIndex: number
): void {
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

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

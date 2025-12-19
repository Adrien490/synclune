import { useSyncExternalStore } from "react";

// Media query pour detecter appareils tactiles (smartphones, tablettes)
// - hover: none = pas de survol possible (pas de souris)
// - pointer: coarse = pointeur imprecis (doigt vs curseur souris)
const TOUCH_MEDIA_QUERY = "(hover: none) and (pointer: coarse)";

/**
 * Hook pour detecter si l'appareil est tactile (smartphone, tablette)
 *
 * Difference avec useIsMobile:
 * - useIsMobile: detecte la LARGEUR d'ecran (responsive layout)
 * - useIsTouchDevice: detecte la CAPACITE tactile (interactions)
 *
 * Exemples:
 * - iPad Pro paysage: useIsMobile=false (1024px), useIsTouchDevice=true
 * - Laptop petit ecran: useIsMobile=true, useIsTouchDevice=false
 *
 * Cas d'usage:
 * - Desactiver hover effects sur tactile
 * - Desactiver parallax/animations lourdes
 * - Adapter drag & drop pour touch
 *
 * @returns true si appareil tactile, false sinon (SSR: false)
 */
export function useIsTouchDevice() {
	return useSyncExternalStore(
		// Subscribe: ecoute les changements (ex: clavier Bluetooth connecte/deconnecte)
		(callback) => {
			const mq = window.matchMedia(TOUCH_MEDIA_QUERY);
			mq.addEventListener("change", callback);
			return () => mq.removeEventListener("change", callback);
		},
		// getSnapshot: valeur cote client
		() => window.matchMedia(TOUCH_MEDIA_QUERY).matches,
		// getServerSnapshot: fallback SSR (desktop par defaut)
		() => false
	);
}

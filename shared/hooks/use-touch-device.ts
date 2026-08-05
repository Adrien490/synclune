"use client";

import { useSyncExternalStore } from "react";

import { TOUCH_QUERY } from "@/shared/constants/pointer";

/**
 * Ré-export sous son nom historique — `use-haptic.ts` et plusieurs tests
 * l'importent d'ici, et `triggerHaptic` doit interroger la même capacité sans
 * pouvoir appeler un hook (c'est une fonction module).
 *
 * La chaîne elle-même vit désormais dans `shared/constants/pointer.ts`, avec ses
 * deux voisines : elle y est documentée comme n'étant **pas** la négation de
 * `HOVER_CAPABLE_QUERY` (un portable tactile ne matche ni l'une ni l'autre).
 */
export const TOUCH_MEDIA_QUERY = TOUCH_QUERY;

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
		() => false,
	);
}

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Hook pour détecter si l'écran est en mode mobile
 * Utilise useSyncExternalStore (React 19) au lieu de useEffect pour:
 * - Meilleur support SSR avec fallback
 * - Pas de flash/hydration mismatch
 * - Code plus idiomatique
 */
export function useIsMobile() {
	return useSyncExternalStore(
		// Subscribe: écoute les changements de media query
		(listener) => {
			const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
			mql.addEventListener("change", listener);
			return () => mql.removeEventListener("change", listener);
		},
		// getSnapshot: retourne la valeur côté client
		() => window.innerWidth < MOBILE_BREAKPOINT,
		// getServerSnapshot: fallback SSR (false = desktop par défaut)
		() => false
	);
}

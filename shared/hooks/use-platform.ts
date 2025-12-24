import { useSyncExternalStore } from "react";

type Platform = "mac" | "windows" | "linux" | "unknown";

/**
 * Detecte la plateforme de l'utilisateur
 * Utile pour afficher les raccourcis clavier adaptes (⌘ vs Ctrl)
 */
function detectPlatform(): Platform {
	if (typeof navigator === "undefined") return "unknown";

	const platform = navigator.platform?.toLowerCase() ?? "";
	const userAgent = navigator.userAgent?.toLowerCase() ?? "";

	if (platform.includes("mac") || userAgent.includes("mac")) return "mac";
	if (platform.includes("win") || userAgent.includes("win")) return "windows";
	if (platform.includes("linux") || userAgent.includes("linux")) return "linux";

	return "unknown";
}

// Cache la valeur cote client (ne change pas pendant la session)
let cachedPlatform: Platform | null = null;

function getPlatform(): Platform {
	if (cachedPlatform === null) {
		cachedPlatform = detectPlatform();
	}
	return cachedPlatform;
}

/**
 * Hook pour detecter la plateforme de l'utilisateur
 *
 * @returns La plateforme detectee ("mac" | "windows" | "linux" | "unknown")
 *
 * @example
 * const platform = usePlatform()
 * const shortcut = platform === "mac" ? "⌘K" : "Ctrl+K"
 */
export function usePlatform(): Platform {
	return useSyncExternalStore(
		// Subscribe: la plateforme ne change pas, donc pas de listener
		() => () => {},
		// getSnapshot: valeur cote client
		getPlatform,
		// getServerSnapshot: fallback SSR (mac par defaut pour UX majoritaire)
		() => "mac" as Platform
	);
}

/**
 * Hook simplifie pour detecter si l'utilisateur est sur Mac
 *
 * @returns true si Mac, false sinon (SSR: true par defaut)
 *
 * @example
 * const isMac = useIsMac()
 * const modifier = isMac ? "⌘" : "Ctrl"
 */
export function useIsMac(): boolean {
	const platform = usePlatform();
	return platform === "mac";
}

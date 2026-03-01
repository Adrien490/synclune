"use client";

import { useSyncExternalStore } from "react";

type Platform = "mac" | "windows" | "linux" | "unknown";

/**
 * Detects the user's platform.
 * Uses Navigator.userAgentData (UA Client Hints) when available,
 * falls back to navigator.platform (deprecated) + userAgent.
 */
function detectPlatform(): Platform {
	if (typeof navigator === "undefined") return "unknown";

	// Modern API: Navigator.userAgentData (Chrome 90+, Edge 90+, Opera 76+)
	if (
		"userAgentData" in navigator &&
		(navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform
	) {
		const platform = (
			navigator as Navigator & { userAgentData: { platform: string } }
		).userAgentData.platform.toLowerCase();
		if (platform.includes("mac")) return "mac";
		if (platform.includes("win")) return "windows";
		if (platform.includes("linux")) return "linux";
		return "unknown";
	}

	// Fallback: navigator.platform (deprecated but widely supported)
	const platform = navigator.platform.toLowerCase();
	const userAgent = navigator.userAgent.toLowerCase();

	if (platform.includes("mac") || userAgent.includes("mac")) return "mac";
	if (platform.includes("win") || userAgent.includes("win")) return "windows";
	if (platform.includes("linux") || userAgent.includes("linux")) return "linux";

	return "unknown";
}

// Cache the value client-side (does not change during session)
let cachedPlatform: Platform | null = null;

function getPlatform(): Platform {
	cachedPlatform ??= detectPlatform();
	return cachedPlatform;
}

/**
 * Hook to detect the user's platform
 * @internal Used only by useIsMac
 */
function usePlatform(): Platform {
	return useSyncExternalStore(
		// Subscribe: platform does not change, so no listener
		() => () => {},
		// getSnapshot: client value
		getPlatform,
		// getServerSnapshot: SSR fallback (mac by default for majority UX)
		() => "mac" as Platform,
	);
}

/**
 * Hook to detect if the user is on Mac
 *
 * @returns true if Mac, false otherwise (SSR: true by default)
 *
 * @example
 * const isMac = useIsMac()
 * const modifier = isMac ? "⌘" : "Ctrl"
 */
export function useIsMac(): boolean {
	const platform = usePlatform();
	return platform === "mac";
}

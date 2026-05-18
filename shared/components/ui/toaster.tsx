"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { MicroToast } from "@/shared/components/ui/micro-toast";
import { toastIcons } from "@/shared/components/ui/toast-icons";

/**
 * Toaster responsive avec position et gestes adaptés mobile/desktop.
 *
 * - Desktop (>768px): top-center, swipe horizontal pour dismiss, gap 12px.
 * - Mobile (≤768px): bottom-center, swipe vers le bas (natif iOS/Android), gap 8px.
 *
 * Le safe-area iOS (notch/home indicator) est respecté via `offset` env() et
 * le CSS `[data-sonner-toaster]` dans app/styles/components.css.
 */
export function AppToaster() {
	const isMobile = useIsMobile();
	// Mobile portrait strict : 1 toast (espace vertical contraint, pattern iOS)
	// Desktop / mobile landscape / tablette : stack 3 (pattern macOS/iPadOS)
	const isLandscape = useMediaQuery("(orientation: landscape) and (min-width: 768px)");
	const visibleToasts = isMobile && !isLandscape ? 1 : 3;

	return (
		<>
			<MicroToast />
			<SonnerToaster
				theme="light"
				position={isMobile ? "bottom-center" : "top-center"}
				visibleToasts={visibleToasts}
				icons={toastIcons}
				closeButton
				swipeDirections={isMobile ? ["bottom"] : ["right", "left"]}
				gap={isMobile ? 8 : 12}
				offset={
					isMobile
						? "calc(var(--bottom-bar-height, 0px) + max(1rem, env(safe-area-inset-bottom)))"
						: "max(1rem, env(safe-area-inset-top))"
				}
			/>
			{/*
			 * Régions sr-only pour VoiceOver/TalkBack (WCAG 4.1.3 Status Messages).
			 * Sonner 2.0 n'expose pas `aria-live` sur son conteneur — on double via
			 * ces régions pilotées par `announceToScreenReader` dans shared/utils/toast.ts.
			 */}
			<div
				id="toast-live-polite"
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			/>
			<div
				id="toast-live-assertive"
				role="alert"
				aria-live="assertive"
				aria-atomic="true"
				className="sr-only"
			/>
		</>
	);
}

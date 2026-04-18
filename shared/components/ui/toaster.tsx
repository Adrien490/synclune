"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

/**
 * Icônes bijoux raffinées pour les toasts Synclune
 * Design ultrathink (stroke 1.5) avec touches rose & doré
 *
 * Taille 18px (vs 24px standard DS) : optimisée pour le contexte toast compact
 * tout en maintenant la lisibilité des détails (sparkle, facettes diamant)
 *
 * Métaphores:
 * - Success: Diamant avec sparkle doré
 * - Error: Coeur brisé
 * - Warning: Étoile/sparkle doré
 * - Loading: Anneau/bague qui tourne
 */
const icons = {
	success: (
		<div className="relative" aria-hidden="true">
			<svg
				className="text-primary size-[18px]"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path strokeLinecap="round" strokeLinejoin="round" d="M12 3L4 9l8 12 8-12-8-6z" />
				<path strokeLinecap="round" strokeLinejoin="round" d="M4 9h16" />
				<path strokeLinecap="round" strokeLinejoin="round" d="M8.5 9L12 21l3.5-12" />
			</svg>
			<svg
				className="text-secondary animate-sparkle-pulse absolute -top-0.5 -right-0.5 size-2"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9L12 0Z" />
			</svg>
		</div>
	),
	error: (
		<div className="relative" aria-hidden="true">
			<svg
				className="text-primary animate-heart-beat size-[18px]"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 21C12 21 4 14 4 8.5C4 5.5 6.5 3 9.5 3C11 3 12 4 12 4C12 4 13 3 14.5 3C17.5 3 20 5.5 20 8.5C20 14 12 21 12 21Z"
				/>
				<path strokeLinecap="round" strokeLinejoin="round" d="M12 4L10 10L14 12L12 21" />
			</svg>
			<svg
				className="text-primary/60 animate-sparkle-pulse absolute -right-0.5 -bottom-0.5 size-1.5"
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9L12 0Z" />
			</svg>
		</div>
	),
	warning: (
		<div className="relative" aria-hidden="true">
			<svg
				className="text-secondary size-[18px]"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 2L14 8.5L21 9L16 14L17.5 21L12 17.5L6.5 21L8 14L3 9L10 8.5L12 2Z"
				/>
				<circle cx="12" cy="12" r="1.5" fill="none" stroke="currentColor" />
			</svg>
			<svg
				className="text-secondary animate-sparkle-pulse absolute -top-0.5 -right-0.5 size-1.5"
				style={{ animationDelay: "1s" }}
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9L12 0Z" />
			</svg>
		</div>
	),
	loading: (
		<div className="relative size-[18px]" aria-hidden="true">
			<svg
				className="text-primary/30 size-full"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<circle cx="12" cy="12" r="8" />
			</svg>
			<svg
				className="text-primary absolute inset-0 size-full animate-spin"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path strokeLinecap="round" d="M12 4a8 8 0 0 1 6.93 4" />
			</svg>
			<svg
				className="text-primary/40 animate-sparkle-pulse absolute -top-0.5 -right-0.5 size-1.5"
				style={{ animationDelay: "0.5s" }}
				viewBox="0 0 24 24"
				fill="currentColor"
			>
				<path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9L12 0Z" />
			</svg>
		</div>
	),
};

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
			<SonnerToaster
				theme="light"
				position={isMobile ? "bottom-center" : "top-center"}
				visibleToasts={visibleToasts}
				icons={icons}
				closeButton
				swipeDirections={isMobile ? ["bottom"] : ["right", "left"]}
				gap={isMobile ? 8 : 12}
				offset={
					isMobile
						? "max(1rem, env(safe-area-inset-bottom))"
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

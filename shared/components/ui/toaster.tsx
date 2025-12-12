"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/shared/hooks/use-mobile";

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
				className="size-[18px] text-primary"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 3L4 9l8 12 8-12-8-6z"
				/>
				<path strokeLinecap="round" strokeLinejoin="round" d="M4 9h16" />
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M8.5 9L12 21l3.5-12"
				/>
			</svg>
			<svg
				className="absolute -top-0.5 -right-0.5 size-2 text-secondary animate-sparkle-pulse"
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
				className="size-[18px] text-primary animate-heart-beat"
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
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M12 4L10 10L14 12L12 21"
				/>
			</svg>
			<svg
				className="absolute -bottom-0.5 -right-0.5 size-1.5 text-primary/60 animate-sparkle-pulse"
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
				className="size-[18px] text-secondary"
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
				className="absolute -top-0.5 -right-0.5 size-1.5 text-secondary animate-sparkle-pulse"
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
				className="size-full text-primary/30"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<circle cx="12" cy="12" r="8" />
			</svg>
			<svg
				className="absolute inset-0 size-full text-primary animate-spin"
				viewBox="0 0 24 24"
				fill="none"
				strokeWidth="1.5"
				stroke="currentColor"
			>
				<path strokeLinecap="round" d="M12 4a8 8 0 0 1 6.93 4" />
			</svg>
			<svg
				className="absolute -top-0.5 -right-0.5 size-1.5 text-primary/40 animate-sparkle-pulse"
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
 * Toaster responsive avec position adaptée mobile/desktop
 *
 * - Desktop (>768px): top-center avec safe-area-inset-top
 * - Mobile (≤768px): bottom-center avec safe-area-inset-bottom
 *
 * Note: On utilise useIsMobile (768px) au lieu de mobileOffset Sonner (600px)
 * pour cohérence avec le breakpoint du reste de l'app et contrôle simultané
 * de la position ET de l'offset.
 */
export function AppToaster() {
	const { resolvedTheme } = useTheme();
	const isMobile = useIsMobile();

	return (
		<SonnerToaster
			theme={resolvedTheme as "light" | "dark" | "system"}
			position={isMobile ? "bottom-center" : "top-center"}
			duration={2500}
			visibleToasts={1}
			icons={icons}
			closeButton
			offset={
				isMobile
					? "max(1rem, env(safe-area-inset-bottom))"
					: "max(1rem, env(safe-area-inset-top))"
			}
			toastOptions={{
				className: isMobile ? "!mb-safe" : "!mt-safe",
			}}
		/>
	);
}

import type { ReactNode } from "react";

/**
 * Props for Fade component
 */
export interface FadeProps {
	children: ReactNode;
	className?: string;
	delay?: number;
	duration?: number;
	y?: number;
	inView?: boolean;
	once?: boolean;
	/** Désactiver l'animation sur appareils tactiles (mobile/tablette) pour performance */
	disableOnTouch?: boolean;
}

/**
 * Props for Reveal component (whileInView)
 */
export interface RevealProps {
	children: ReactNode;
	className?: string;
	delay?: number;
	duration?: number;
	y?: number;
	once?: boolean;
	amount?: ViewportAmount;
	role?: string;
	/** Désactiver l'animation sur appareils tactiles (mobile/tablette) pour performance */
	disableOnTouch?: boolean;
	/** Data attributes (e.g., data-testid) */
	[key: `data-${string}`]: string | undefined;
}

/**
 * Props for Stagger component
 */
export interface StaggerProps {
	children: ReactNode;
	/** Tag du conteneur (défaut `div`). `ul`/`ol` pour une vraie liste sémantique. */
	as?: "div" | "ul" | "ol";
	/** Tag du wrapper de chaque enfant (défaut `div`). Mettre `li` quand `as="ul"`. */
	itemAs?: "div" | "li";
	className?: string;
	stagger?: number;
	delay?: number;
	/** Durée d'animation pour chaque enfant en secondes (défaut: normal) */
	duration?: number;
	y?: number;
	/** Enable scroll-triggered animation with whileInView */
	inView?: boolean;
	/** Only animate once when entering viewport (default: true) */
	once?: boolean;
	/** Portion of element that must be visible to trigger (default: 0.2) */
	amount?: ViewportAmount;
	role?: string;
	/** Désactiver l'animation sur appareils tactiles (mobile/tablette) pour performance */
	disableOnTouch?: boolean;
	/** Data attributes (e.g., data-carousel-scroll) */
	[key: `data-${string}`]: string | undefined;
}

/**
 * Viewport amount type for reveal animations
 */
type ViewportAmount = number | "some" | "all";

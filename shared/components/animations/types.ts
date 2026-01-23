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
 * Props for Slide component
 */
export interface SlideProps {
	children: ReactNode;
	className?: string;
	direction?: SlideDirection;
	distance?: number;
	delay?: number;
	duration?: number;
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
	className?: string;
	stagger?: number;
	delay?: number;
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
 * Direction type for slide animations
 */
export type SlideDirection = "up" | "down" | "left" | "right";

/**
 * Viewport amount type for reveal animations
 */
export type ViewportAmount = number | "some" | "all";

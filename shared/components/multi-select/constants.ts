import { cva } from "class-variance-authority";
import type {
	BadgeAnimationType,
	PopoverAnimationType,
	ResponsiveConfig,
	ResponsiveSettings,
	ScreenSize,
} from "./types";

/**
 * Variants CVA pour les badges du MultiSelect
 */
export const multiSelectVariants = cva("m-1 transition-all duration-300 ease-in-out", {
	variants: {
		variant: {
			default: "border-foreground/10 text-foreground bg-card hover:bg-card/80",
			secondary:
				"border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80",
			destructive:
				"border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
			inverted: "inverted",
		},
		badgeAnimation: {
			bounce: "hover:-translate-y-1 hover:scale-110",
			pulse: "hover:animate-pulse",
			wiggle: "hover:animate-wiggle",
			fade: "hover:opacity-80",
			slide: "hover:translate-x-1",
			none: "",
		},
	},
	defaultVariants: {
		variant: "default",
		badgeAnimation: "none",
	},
});

/**
 * Lookup table des classes d'animation pour les badges
 */
export const BADGE_ANIMATION_CLASSES: Record<BadgeAnimationType, string> = {
	bounce: "hover:-translate-y-1 hover:scale-110",
	pulse: "hover:animate-pulse",
	wiggle: "hover:animate-wiggle",
	fade: "hover:opacity-80",
	slide: "hover:translate-x-1",
	none: "",
};

/**
 * Lookup table des classes d'animation pour le popover
 */
export const POPOVER_ANIMATION_CLASSES: Record<PopoverAnimationType, string> = {
	scale: "animate-scaleIn",
	slide: "animate-slideInDown",
	fade: "animate-fadeIn",
	flip: "animate-flipIn",
	none: "",
};

/**
 * Configuration responsive par defaut
 */
export const DEFAULT_RESPONSIVE_CONFIG: Required<ResponsiveConfig> = {
	mobile: { maxCount: 2, hideIcons: false, compactMode: true },
	tablet: { maxCount: 4, hideIcons: false, compactMode: false },
	desktop: { maxCount: 6, hideIcons: false, compactMode: false },
};

/**
 * Settings par defaut quand responsive est desactive
 */
export const DEFAULT_NON_RESPONSIVE_SETTINGS: ResponsiveSettings = {
	maxCount: 3,
	hideIcons: false,
	compactMode: false,
};

/**
 * Breakpoints pour la detection de taille d'ecran
 */
export const SCREEN_BREAKPOINTS = {
	mobile: 640,
	tablet: 1024,
} as const;

/**
 * Obtenir la taille d'ecran actuelle
 */
export function getScreenSize(width: number): ScreenSize {
	if (width < SCREEN_BREAKPOINTS.mobile) return "mobile";
	if (width < SCREEN_BREAKPOINTS.tablet) return "tablet";
	return "desktop";
}

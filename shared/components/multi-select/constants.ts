import { cva } from "class-variance-authority";
import type {
	BadgeAnimationType,
	PopoverAnimationType,
	ResponsiveConfig,
	ResponsiveSettings,
	ScreenSize,
} from "./types";

// =============================================================================
// TIMING CONSTANTS
// =============================================================================

/**
 * Délai avant de vider les messages ARIA (ms)
 * Court pour éviter les annonces répétées
 */
export const ARIA_CLEAR_DELAY = 100;

/**
 * Durée d'affichage du focus ring lors de focus() (ms)
 */
export const FOCUS_RING_DURATION = 1000;

// =============================================================================
// I18N LABELS (French)
// =============================================================================

/**
 * Labels centralisés pour l'internationalisation
 */
export const MULTI_SELECT_LABELS = {
	placeholder: "Sélectionner",
	selectAll: "Tout sélectionner",
	selectAllWithCount: (count: number) =>
		count > 20 ? `Tout sélectionner - ${count} éléments` : "Tout sélectionner",
	clearAll: "Effacer",
	close: "Fermer",
	finish: "Terminer la sélection",
	search: "Rechercher...",
	loading: "Chargement...",
	noResults: "Aucun résultat",
	noResultsFor: (search: string) => `Aucun résultat pour "${search}"`,
	noOptions: "Aucune option disponible",
	moreItems: (count: number) => `+ ${count} de plus`,
	removeItem: (label: string) => `Retirer ${label} de la sélection`,
	removeExtra: (count: number) => `Retirer les ${count} options supplémentaires`,
	clearSelection: (count: number) =>
		`Effacer les ${count} options sélectionnées`,
	// Annonces ARIA
	ariaSelected: (label: string, count: number, total: number) =>
		`${label} sélectionné. ${count} sur ${total} options.`,
	ariaMultipleAdded: (added: number, count: number, total: number) =>
		`${added} options ajoutées. ${count} sur ${total}.`,
	ariaRemoved: (count: number, total: number) =>
		`Option retirée. ${count} sur ${total} options.`,
	ariaListOpen: (total: number) =>
		`Liste ouverte. ${total} options. Flèches pour naviguer.`,
	ariaListClosed: "Liste fermée.",
	ariaSearchResults: (count: number, search: string) =>
		`${count} résultat${count === 1 ? "" : "s"} pour "${search}"`,
	ariaNoSelection: "Aucune option sélectionnée",
	ariaSelectionCount: (count: number, labels: string) =>
		`${count} option${count === 1 ? "" : "s"} sélectionnée${count === 1 ? "" : "s"} : ${labels}`,
	ariaComboboxLabel: (count: number, total: number, placeholder: string) =>
		`Sélection multiple : ${count} sur ${total} options sélectionnées. ${placeholder}`,
	ariaSelectAllOptions: (count: number) =>
		`Sélectionner les ${count} options`,
	ariaSearchHelp: "Tapez pour filtrer. Flèches pour naviguer.",
	ariaMultiSelectHelp:
		"Sélection multiple. Utilisez les flèches pour naviguer, Entrée pour sélectionner, Échap pour fermer.",
	ariaOptionsLabel: "Options disponibles",
	ariaLoadingOptions: "Chargement des options",
	ariaClearAll: "Effacer toutes les options sélectionnées",
	ariaCloseList: "Fermer la liste d'options",
	ariaCloseDrawer: "Fermer",
} as const;

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

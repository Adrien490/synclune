import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { multiSelectVariants } from "./constants";

/**
 * Types d'animation pour les badges
 */
export type BadgeAnimationType =
	| "bounce"
	| "pulse"
	| "wiggle"
	| "fade"
	| "slide"
	| "none";

/**
 * Types d'animation pour le popover
 */
export type PopoverAnimationType =
	| "scale"
	| "slide"
	| "fade"
	| "flip"
	| "none";

/**
 * Configuration des animations pour le composant MultiSelect
 */
export interface AnimationConfig {
	/** Type d'animation pour les badges */
	badgeAnimation?: BadgeAnimationType;
	/** Type d'animation pour le popover */
	popoverAnimation?: PopoverAnimationType;
	/** Duree de l'animation en secondes */
	duration?: number;
	/** Delai de l'animation en secondes */
	delay?: number;
}

/**
 * Option individuelle pour le MultiSelect
 */
export interface MultiSelectOption {
	/** Texte affiche pour l'option */
	label: string;
	/** Valeur unique associee a l'option */
	value: string;
	/** Composant d'icone optionnel */
	icon?: React.ComponentType<{ className?: string }>;
	/** Option desactivee */
	disabled?: boolean;
	/** Style personnalise pour l'option */
	style?: {
		/** Couleur personnalisee du badge */
		badgeColor?: string;
		/** Couleur personnalisee de l'icone */
		iconColor?: string;
		/** Fond en degrade pour le badge */
		gradient?: string;
	};
}

/**
 * Groupe d'options pour organiser les choix
 */
export interface MultiSelectGroup {
	/** Titre du groupe */
	heading: string;
	/** Options dans ce groupe */
	options: MultiSelectOption[];
}

/**
 * Configuration responsive pour differentes tailles d'ecran
 */
export interface ResponsiveScreenConfig {
	/** Nombre maximum d'items a afficher */
	maxCount?: number;
	/** Masquer les icones */
	hideIcons?: boolean;
	/** Mode compact */
	compactMode?: boolean;
}

/**
 * Configuration responsive complete
 */
export interface ResponsiveConfig {
	/** Configuration mobile (< 640px) */
	mobile?: ResponsiveScreenConfig;
	/** Configuration tablette (640px - 1024px) */
	tablet?: ResponsiveScreenConfig;
	/** Configuration desktop (> 1024px) */
	desktop?: ResponsiveScreenConfig;
}

/**
 * Tailles d'ecran supportees
 */
export type ScreenSize = "mobile" | "tablet" | "desktop";

/**
 * Settings responsive calcules
 */
export interface ResponsiveSettings {
	maxCount: number;
	hideIcons: boolean;
	compactMode: boolean;
}

/**
 * Props pour le composant MultiSelect
 */
export interface MultiSelectProps
	extends Omit<
			React.ButtonHTMLAttributes<HTMLButtonElement>,
			"animationConfig"
		>,
		VariantProps<typeof multiSelectVariants> {
	/** Options a afficher (tableau plat ou groupe) */
	options: MultiSelectOption[] | MultiSelectGroup[];
	/** Callback lors du changement de selection */
	onValueChange: (value: string[]) => void;
	/** Valeurs selectionnees par defaut */
	defaultValue?: string[];
	/** Placeholder (defaut: "Selectionner") */
	placeholder?: string;
	/** Duree d'animation en secondes (defaut: 0) */
	animation?: number;
	/** Configuration avancee des animations */
	animationConfig?: AnimationConfig;
	/** Nombre maximum d'items affiches (defaut: 3) */
	maxCount?: number;
	/** Mode modal du popover (defaut: false) */
	modalPopover?: boolean;
	/** Classes CSS additionnelles */
	className?: string;
	/** Masquer l'option "Tout selectionner" (defaut: false) */
	hideSelectAll?: boolean;
	/** Activer la recherche (defaut: true) */
	searchable?: boolean;
	/** Message/composant quand aucun resultat */
	emptyIndicator?: React.ReactNode;
	/** Taille automatique selon contenu (defaut: false) */
	autoSize?: boolean;
	/** Badges sur une seule ligne avec scroll (defaut: false) */
	singleLine?: boolean;
	/** Classes CSS pour le popover */
	popoverClassName?: string;
	/** Desactiver le composant (defaut: false) */
	disabled?: boolean;
	/** Configuration responsive */
	responsive?: boolean | ResponsiveConfig;
	/** Largeur minimum */
	minWidth?: string;
	/** Largeur maximum */
	maxWidth?: string;
	/** Supprimer automatiquement les doublons (defaut: false) */
	deduplicateOptions?: boolean;
	/** Reset sur changement de defaultValue (defaut: true) */
	resetOnDefaultValueChange?: boolean;
	/** Fermer apres selection (defaut: false) */
	closeOnSelect?: boolean;
	/** Afficher un loader (defaut: false) */
	isLoading?: boolean;
}

/**
 * Methodes exposees via ref
 */
export interface MultiSelectRef {
	/** Reset aux valeurs par defaut */
	reset: () => void;
	/** Obtenir les valeurs selectionnees */
	getSelectedValues: () => string[];
	/** Definir les valeurs selectionnees */
	setSelectedValues: (values: string[]) => void;
	/** Effacer toutes les selections */
	clear: () => void;
	/** Focus le composant */
	focus: () => void;
}

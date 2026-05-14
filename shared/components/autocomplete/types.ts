import type { ReactNode } from "react";
import type { HapticPattern } from "@/shared/hooks/use-haptic";

/**
 * Props pour le composant Autocomplete
 * @template T - Type des items a afficher dans la liste
 */
export interface AutocompleteProps<T> {
	/** Nom du champ pour les formulaires */
	name: string;
	/** Valeur actuelle du champ de recherche */
	value: string;
	/** Desactive le composant */
	disabled?: boolean;
	/** Callback appele lors du changement de valeur */
	onChange: (value: string) => void;
	/** Callback appele lors de la selection d'un item */
	onSelect: (item: T) => void;
	/** Liste des items a afficher */
	items: T[];
	/** Fonction pour obtenir le label d'un item */
	getItemLabel: (item: T) => string;
	/** Fonction pour obtenir une cle unique par item (defaut: getItemLabel) */
	getItemKey?: (item: T) => string;
	/** Fonction pour obtenir la description d'un item */
	getItemDescription?: (item: T) => string | null;
	/** Fonction pour obtenir l'image d'un item */
	getItemImage?: (item: T) => {
		src: string;
		alt: string;
		blurDataURL?: string | null;
	} | null;
	/** Taille de l'image en pixels (defaut: 32) */
	imageSize?: number;
	/** Placeholder du champ de recherche (defaut: "Rechercher...") */
	placeholder?: string;
	/** Indique si les donnees sont en cours de chargement */
	isLoading?: boolean;
	/** Message d'erreur a afficher (ex: erreur reseau) */
	error?: string | null;
	/** Callback pour retenter la recherche apres une erreur */
	onRetry?: () => void;
	/** Classes CSS additionnelles pour le conteneur */
	className?: string;
	/** Classes CSS additionnelles pour l'input */
	inputClassName?: string;
	/** Message affiche quand aucun resultat (defaut: "Aucun resultat trouve") */
	noResultsMessage?: string;
	/** Description affichee sous le message (defaut: "Essayez de modifier votre recherche") */
	noResultsDescription?: string;
	/** Slot rendu apres la description dans l'etat vide (ex: bouton "Saisir manuellement") */
	emptyStateAction?: ReactNode;
	/** Nombre minimum de caracteres pour lancer la recherche (defaut: 3) */
	minQueryLength?: number;
	/** Delai avant fermeture du dropdown sur blur en ms (defaut: 150) */
	blurDelay?: number;
	/** Nombre de skeletons affiches pendant le chargement (defaut: 3) */
	loadingSkeletonCount?: number;
	/** Afficher l'icone de recherche (defaut: true) */
	showSearchIcon?: boolean;
	/** Afficher le bouton pour vider le champ (defaut: true) */
	showClearButton?: boolean;
	/** Delai de debounce en ms pour onChange (defaut: 300, 0 = desactive) */
	debounceMs?: number;
	/** Afficher le nombre de resultats (defaut: false) */
	showResultsCount?: boolean;
	/** Afficher l'etat vide quand aucun resultat (defaut: true) */
	showEmptyState?: boolean;
	/**
	 * Pattern haptic sur selection (defaut: "selection").
	 * Clear/Escape/Retry restent sur "light" si haptic !== false.
	 * Passer `false` pour desactiver tous les retours haptiques.
	 */
	haptic?: HapticPattern | false;
	/** ARIA: marks the input as invalid */
	"aria-invalid"?: boolean;
	/** ARIA: associates the input with an error message element */
	"aria-describedby"?: string;
	/** ARIA: marks the input as required */
	"aria-required"?: boolean;
	/**
	 * Attribut autoComplete natif du navigateur (defaut: "off").
	 * Pour activer l'autofill OS sur un champ adresse : "street-address", "address-line1", etc.
	 */
	autoComplete?: string;
	/** Mode clavier virtuel mobile (defaut: "search") */
	inputMode?: "search" | "text" | "none" | "tel" | "url" | "email" | "numeric" | "decimal";
	/** Mobile virtual keyboard action button (defaut: "search") */
	enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
	/** Autocorrection navigateur (defaut: "off" - contexte recherche) */
	autoCorrect?: "on" | "off";
	/** Auto-majuscule mobile (defaut: "off" - contexte recherche) */
	autoCapitalize?: "off" | "none" | "on" | "sentences" | "words" | "characters";
	/** Verification orthographique (defaut: false) */
	spellCheck?: boolean;
}

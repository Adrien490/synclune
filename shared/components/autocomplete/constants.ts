import type { Transition } from "framer-motion";

/**
 * Valeurs par defaut pour le composant Autocomplete
 */
export const AUTOCOMPLETE_DEFAULTS = {
	/** Taille des images en pixels (40px pour meilleure lisibilité mobile) */
	imageSize: 40,
	/** Placeholder du champ de recherche */
	placeholder: "Rechercher...",
	/** Message quand aucun resultat */
	noResultsMessage: "Aucun résultat trouvé",
	/** Nombre minimum de caracteres pour lancer la recherche */
	minQueryLength: 3,
	/** Delai avant fermeture sur blur (ms) */
	blurDelay: 150,
	/** Nombre de skeletons pendant le chargement */
	loadingSkeletonCount: 3,
	/** Afficher l'icone de recherche */
	showSearchIcon: true,
	/** Afficher le bouton clear */
	showClearButton: true,
} as const;

/**
 * Configurations d'animation pour le composant Autocomplete
 */
export const AUTOCOMPLETE_ANIMATIONS = {
	/** Animation du hint (caracteres restants) */
	hint: {
		initial: { opacity: 0, y: -4 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -4 },
		transition: { duration: 0.15 } as Transition,
	},
	/** Animation de la liste de resultats */
	dropdown: {
		initial: { opacity: 0, y: -10 },
		animate: { opacity: 1, y: 0 },
		exit: { opacity: 0, y: -10 },
		transition: { duration: 0.15 } as Transition,
	},
	/** Animation d'apparition des items */
	item: {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		/** Delai maximum pour l'animation des items */
		maxDelay: 0.3,
		/** Multiplicateur de delai par index */
		delayMultiplier: 0.03,
	},
} as const;

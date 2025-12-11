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
	/** Fonction pour obtenir la description d'un item */
	getItemDescription?: (item: T) => string | null;
	/** Fonction pour obtenir l'image d'un item */
	getItemImage?: (item: T) => {
		src: string;
		alt: string;
		blurDataUrl?: string | null;
	} | null;
	/** Taille de l'image en pixels (defaut: 32) */
	imageSize?: number;
	/** Placeholder du champ de recherche (defaut: "Rechercher...") */
	placeholder?: string;
	/** Indique si les donnees sont en cours de chargement */
	isLoading?: boolean;
	/** Classes CSS additionnelles pour le conteneur */
	className?: string;
	/** Classes CSS additionnelles pour l'input */
	inputClassName?: string;
	/** Message affiche quand aucun resultat (defaut: "Aucun resultat trouve") */
	noResultsMessage?: string;
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
}

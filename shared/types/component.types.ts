import type { MouseEvent, ReactNode, RefObject } from "react";
import type { SortOption } from "@/shared/types/sort.types";

type FilterOption = {
	value: string;
	label: string;
};

/**
 * Props pour le composant CursorPagination
 */
export interface CursorPaginationProps {
	perPage: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	currentPageSize: number;
	nextCursor: string | null;
	prevCursor: string | null;
	/** Options personnalisees pour le nombre d'elements par page */
	perPageOptions?: readonly number[] | number[];
	/**
	 * Ref vers l'element qui doit recevoir le focus apres navigation
	 * Ameliore l'accessibilite clavier en ramenant le focus au bon endroit
	 */
	focusTargetRef?: RefObject<HTMLElement | null>;
	/**
	 * Total optionnel d'éléments dans la collection (toutes pages confondues).
	 * Si fourni ET strictement supérieur à `currentPageSize`, l'affichage
	 * devient "X sur N résultats" (mobile : "X sur N"). Sinon, comportement
	 * inchangé "X résultats". Le backend doit calculer ce count avec parcimonie
	 * (ex: prisma.count en transaction avec findMany).
	 *
	 * Note : la position exacte (page X/Y) n'est pas calculable en
	 * cursor-pagination opaque mid-navigation, d'où le format compact "X sur N".
	 */
	totalCount?: number;
	/**
	 * Afficher le compteur « X sur N résultats » dans la barre.
	 *
	 * `false` pour les listes admin : la barre entière disparaît quand il n'y a
	 * qu'une page (cas normal à faible volume), le compteur y serait donc
	 * invisible la plupart du temps. `AdminDataTable` le rend lui-même, hors de
	 * la zone conditionnelle.
	 *
	 * @default true
	 */
	showCount?: boolean;
	/**
	 * Instance secondaire : rend les contrôles mais n'installe AUCUN effet
	 * global (raccourcis clavier Alt+Flèche, `router.prefetch`, `<link rel>`).
	 *
	 * Les listes admin montent DEUX instances en permanence (la table desktop en
	 * `hidden md:block` et la liste mobile en `md:hidden` sont toutes deux dans
	 * le DOM à toutes les tailles). Sans ce drapeau, chaque Alt+Flèche déclenche
	 * deux `router.push`, chaque page émet deux `<link rel="next">` et prefetch
	 * deux fois.
	 *
	 * @default false
	 */
	secondary?: boolean;
}

/**
 * Props pour le composant FilterSheetWrapper
 */
export interface FilterSheetWrapperProps {
	/** Number of active filters to display in badge */
	activeFiltersCount?: number;
	/** Whether there are any active filters */
	hasActiveFilters?: boolean;
	/** Callback to clear all filters */
	onClearAll?: () => void;
	/** Children (form content) */
	children: ReactNode;
	/** Callback when filters are applied */
	onApply?: () => void;
	/** Whether the operation is pending */
	isPending?: boolean;
	/** Custom trigger button className */
	triggerClassName?: string;
	/** Sheet title */
	title?: string;
	/** Sheet description (optional subtitle) */
	description?: string;
	/** Custom apply button text */
	applyButtonText?: string;
	/**
	 * Ligne d'information au-dessus du bouton Appliquer (compteur vivant,
	 * état vide chiffré). Annoncée en région live polie.
	 */
	footerHint?: ReactNode;
	/** Désactive le bouton Appliquer (ex : 0 résultat pour les valeurs en attente). */
	applyDisabled?: boolean;
	/**
	 * Un recomptage est en vol : le bouton montre un `Spinner` SANS se désactiver.
	 * Distinct d'`isPending`, qui signale une navigation et grise tout le panneau —
	 * ici seul le CHIFFRE du libellé est provisoire.
	 */
	applyBusy?: boolean;
	/** Controlled open state */
	open?: boolean;
	/** Callback when open state changes (for controlled mode) */
	onOpenChange?: (open: boolean) => void;
	/** Custom trigger element (if not provided, uses default button) */
	trigger?: ReactNode;
	/** Hide the default trigger button entirely (for external triggers) */
	hideTrigger?: boolean;
	/**
	 * Fires when the user taps the scrim overlay. If omitted, defaults to
	 * emitting a selection haptic.
	 */
	onOverlayClick?: (event: MouseEvent<HTMLDivElement>) => void;
	/**
	 * Vaul snap points for the mobile bottom-sheet variant. Values are
	 * fractions of the viewport (e.g. [0.5, 0.92]) or CSS length strings.
	 * Ignored on desktop (right-side sheet).
	 */
	snapPoints?: (number | string)[];
	/**
	 * Si le nombre de filtres actifs est strictement supérieur ou égal à ce
	 * seuil, le bouton "Tout effacer" ouvre un AlertDialog de confirmation
	 * avant de déclencher `onClearAll`. Passez `0` pour toujours confirmer,
	 * `Infinity` pour désactiver complètement.
	 * @default 3
	 */
	confirmClearThreshold?: number;
	/**
	 * DOM `id` of the popup content. Wire this in pair with `aria-controls`
	 * on the trigger button so AT can announce which popup is operated.
	 */
	id?: string;
}

/**
 * Props pour le composant SortSelect
 */
export interface SortSelectProps {
	label: string;
	options: SortOption[];
	placeholder?: string;
	className?: string;
	/** Maximum height for dropdown in pixels */
	maxHeight?: number;
}

/**
 * Props pour le composant SelectFilter
 */
export interface SelectFilterProps {
	filterKey: string;
	label: string;
	options: FilterOption[];
	placeholder?: string;
	className?: string;
	maxHeight?: number;
	/** Si true, utilise filterKey directement sans prefixe "filter_" dans l'URL */
	noPrefix?: boolean;
}

/**
 * Item pour le composant TabNavigation
 */
export interface TabNavigationItem {
	label: string;
	value: string;
	href: string;
}

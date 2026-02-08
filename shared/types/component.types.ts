import type { ReactNode, RefObject } from "react";
import type { SortOption } from "@/shared/types/sort.types";
import type { FilterOption } from "@/shared/types/pagination.types";

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
	/** Custom cancel button text */
	cancelButtonText?: string;
	/** Show cancel button */
	showCancelButton?: boolean;
	/** Controlled open state */
	open?: boolean;
	/** Callback when open state changes (for controlled mode) */
	onOpenChange?: (open: boolean) => void;
	/** Custom trigger element (if not provided, uses default button) */
	trigger?: ReactNode;
	/** Hide the default trigger button entirely (for external triggers) */
	hideTrigger?: boolean;
}

/**
 * Props pour le composant SectionTitle
 */
export interface SectionTitleProps {
	children: ReactNode;
	id?: string;
	className?: string;
	/**
	 * Niveau de titre semantique
	 * @default "h2"
	 */
	as?: "h1" | "h2" | "h3";
	/**
	 * Variante de taille
	 * @default "default"
	 */
	size?: "hero" | "default" | "small";
	/**
	 * Alignement du texte
	 * @default "center"
	 */
	align?: "left" | "center" | "right";
	/**
	 * Graisse de la police
	 * @default "semibold"
	 */
	weight?: "light" | "normal" | "medium" | "semibold";
	/**
	 * Utiliser l'italique (Fraunces italic)
	 * @default false
	 */
	italic?: boolean;
	/**
	 * Schema.org itemProp attribute
	 */
	itemProp?: string;
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
	/** Show label outside of select instead of inside */
	externalLabel?: boolean;
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

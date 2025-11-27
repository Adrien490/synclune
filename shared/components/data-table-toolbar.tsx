import { cn } from "@/shared/utils/cn";
import { ReactNode } from "react";

/**
 * DataTableToolbar - Container for data table controls (search, filters, sort, actions)
 *
 * Groups logically related controls for data manipulation.
 *
 * @example
 * ```tsx
 * <DataTableToolbar ariaLabel="Product filters">
 *   <SearchForm placeholder="Search products..." />
 *   <div className="flex gap-2">
 *     <SortSelect />
 *     <FilterSheet />
 *   </div>
 * </DataTableToolbar>
 * ```
 */
interface DataTableToolbarProps {
	/**
	 * Toolbar controls (search, filters, sort, actions)
	 *
	 * Accepts any ReactNode. Common patterns:
	 * - SearchForm (flex-1 for left alignment)
	 * - Div wrapper for grouped actions (right alignment with justify-between)
	 *
	 * @example
	 * ```tsx
	 * <DataTableToolbar>
	 *   <SearchForm />
	 *   <div className="flex gap-2">
	 *     <SortSelect />
	 *     <FilterSheet />
	 *   </div>
	 * </DataTableToolbar>
	 * ```
	 */
	children: ReactNode;

	/**
	 * Additional CSS classes (merged with Tailwind merge)
	 *
	 * Use to override default styles or add custom styling.
	 *
	 * @example
	 * ```tsx
	 * <DataTableToolbar className="bg-accent mb-8" />
	 * ```
	 */
	className?: string;

	/**
	 * ARIA label describing toolbar purpose (for screen readers)
	 *
	 * Default: "Barre d'outils de filtrage et recherche"
	 *
	 * Override with specific context for clarity:
	 * - "Barre d'outils de gestion des produits"
	 * - "Barre d'outils de gestion des commandes"
	 * - "Product filters toolbar" (if i18n)
	 *
	 * @default "Barre d'outils de filtrage et recherche"
	 *
	 * @example
	 * ```tsx
	 * <DataTableToolbar ariaLabel="Product filters toolbar" />
	 * ```
	 */
	ariaLabel?: string;

	/**
	 * Loading state indicator
	 *
	 * When true, reduces opacity and disables pointer events.
	 * Also sets aria-busy for screen readers.
	 *
	 * @default false
	 *
	 * @example
	 * ```tsx
	 * <DataTableToolbar isPending={isFiltering}>
	 *   ...
	 * </DataTableToolbar>
	 * ```
	 */
	isPending?: boolean;
}

export function DataTableToolbar({
	children,
	className,
	ariaLabel = "Barre d'outils de filtrage et recherche",
	isPending = false,
}: DataTableToolbarProps) {
	return (
		<div
			role="toolbar"
			aria-label={ariaLabel}
			aria-orientation="horizontal"
			aria-busy={isPending}
			className={cn(
				"flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-center sm:justify-between",
				"rounded-lg bg-card border border-border/60",
				"transition-shadow duration-200 motion-reduce:transition-none",
				"min-w-0", // Prevent overflow on small screens
				"mb-6 p-4 shadow-sm",
				isPending && "opacity-60 pointer-events-none",
				className
			)}
		>
			{children}
		</div>
	);
}

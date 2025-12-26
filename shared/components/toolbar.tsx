import { cn } from "@/shared/utils/cn";
import { ReactNode } from "react";

/**
 * Toolbar - Container for page controls (search, filters, sort, actions)
 *
 * Layout horizontal adaptatif sur tous les écrans.
 * Les éléments s'adaptent automatiquement à l'espace disponible.
 *
 * @example
 * ```tsx
 * <Toolbar
 *   search={<SearchInput paramName="search" mode="live" size="sm" placeholder="Rechercher..." />}
 *   ariaLabel="Barre d'outils de gestion"
 * >
 *   <SelectFilter ... />
 *   <ProductsFilterSheet />
 * </Toolbar>
 * ```
 */
interface ToolbarProps {
	/**
	 * Toolbar controls (filters, sort, actions)
	 */
	children: ReactNode;

	/**
	 * Search component - displayed on the left side
	 */
	search?: ReactNode;

	/**
	 * Additional CSS classes (merged with Tailwind merge)
	 */
	className?: string;

	/**
	 * ARIA label describing toolbar purpose (for screen readers)
	 * @default "Barre d'outils de filtrage et recherche"
	 */
	ariaLabel?: string;

	/**
	 * Loading state indicator - reduces opacity and disables pointer events
	 * @default false
	 */
	isPending?: boolean;
}

export function Toolbar({
	children,
	search,
	className,
	ariaLabel = "Barre d'outils de filtrage et recherche",
	isPending = false,
}: ToolbarProps) {
	const hasSearch = !!search;

	// Structure simple sans search
	if (!hasSearch) {
		return (
			<div
				role="toolbar"
				aria-label={ariaLabel}
				aria-orientation="horizontal"
				aria-busy={isPending}
				className={cn(
					"flex flex-row flex-wrap gap-2 items-center",
					"md:rounded-lg md:bg-card md:border md:border-border/60",
					"min-w-0 p-0 md:p-4 md:shadow-sm",
					isPending && "opacity-60 pointer-events-none transition-opacity duration-200",
					className
				)}
			>
				{children}
			</div>
		);
	}

	// Structure avec search à gauche et filtres à droite
	return (
		<div
			role="toolbar"
			aria-label={ariaLabel}
			aria-orientation="horizontal"
			aria-busy={isPending}
			className={cn(
				"flex flex-row gap-2 items-center",
				"md:rounded-lg md:bg-card md:border md:border-border/60",
				"min-w-0 p-0 md:p-4 md:shadow-sm",
				isPending && "opacity-60 pointer-events-none transition-opacity duration-200",
				className
			)}
		>
			<div className="flex-1 min-w-0">{search}</div>
			<div className="flex flex-row items-center gap-2 shrink-0">
				{children}
			</div>
		</div>
	);
}

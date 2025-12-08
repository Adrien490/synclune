import { cn } from "@/shared/utils/cn";
import { ReactNode } from "react";

/**
 * Toolbar - Container for page controls (search, filters, sort, actions)
 *
 * Groups logically related controls for data manipulation.
 * Responsive layout: stacked on mobile, horizontal on desktop.
 *
 * @example
 * ```tsx
 * <Toolbar
 *   search={<SearchForm placeholder="Rechercher..." />}
 * >
 *   <SortSelect />
 *   <FilterSheet />
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
					"flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-center sm:justify-between",
					"rounded-lg bg-card border border-border/60",
					"min-w-0 mb-6 p-4 shadow-sm",
					isPending && "opacity-60 pointer-events-none",
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
				"rounded-lg bg-card border border-border/60",
				"min-w-0 mb-6 p-4 shadow-sm",
				isPending && "opacity-60 pointer-events-none",
				className
			)}
		>
			<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
				<div className="flex-1 min-w-0 sm:max-w-md">{search}</div>
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:shrink-0">
					{children}
				</div>
			</div>
		</div>
	);
}

"use client";

import { cn } from "@/shared/utils/cn";
import { ReactNode } from "react";
import { Button } from "./ui/button";
import { SlidersHorizontal } from "lucide-react";
import { useToolbarCollapsed } from "@/shared/hooks/use-toolbar-collapsed";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { AnimatePresence, motion } from "framer-motion";

/**
 * DataTableToolbar - Container for data table controls (search, filters, sort, actions)
 *
 * Groups logically related controls for data manipulation.
 * On mobile, filters can be collapsed to save space.
 *
 * @example
 * ```tsx
 * <DataTableToolbar
 *   initialCollapsed={toolbarCollapsed}
 *   search={<SearchForm placeholder="Rechercher..." />}
 * >
 *   <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
 *     <SortSelect />
 *     <FilterSheet />
 *     <RefreshButton />
 *   </div>
 * </DataTableToolbar>
 * ```
 */
interface DataTableToolbarProps {
	/**
	 * Toolbar controls (filters, sort, actions) - collapsible on mobile
	 */
	children: ReactNode;

	/**
	 * Search component - always visible, even when collapsed
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

	/**
	 * Initial collapsed state from server cookie
	 * @default true (collapsed on mobile by default)
	 */
	initialCollapsed?: boolean;
}

export function DataTableToolbar({
	children,
	search,
	className,
	ariaLabel = "Barre d'outils de filtrage et recherche",
	isPending = false,
	initialCollapsed = true,
}: DataTableToolbarProps) {
	const isMobile = useIsMobile();
	const {
		isCollapsed,
		toggle,
		isPending: isTogglePending,
	} = useToolbarCollapsed({
		initialCollapsed,
	});

	// Si search est fourni → nouvelle structure avec collapse mobile
	// Sinon → ancienne structure (compatibilité)
	const hasSearch = !!search;
	const showCollapsed = isMobile && isCollapsed && hasSearch;

	// Ancienne structure (pas de search prop) - comportement inchangé
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
					"transition-shadow duration-200 motion-reduce:transition-none",
					"min-w-0 mb-6 p-4 shadow-sm",
					isPending && "opacity-60 pointer-events-none",
					className
				)}
			>
				{children}
			</div>
		);
	}

	// Nouvelle structure avec search prop et collapse mobile
	return (
		<div
			role="toolbar"
			aria-label={ariaLabel}
			aria-orientation="horizontal"
			aria-busy={isPending}
			className={cn(
				"rounded-lg bg-card border border-border/60",
				"transition-shadow duration-200 motion-reduce:transition-none",
				"min-w-0 mb-6 p-4 shadow-sm",
				isPending && "opacity-60 pointer-events-none",
				className
			)}
		>
			{/* Desktop: une seule ligne flex-row avec search à gauche et filtres à droite */}
			{!isMobile && (
				<div className="flex flex-row items-center justify-between gap-4">
					{/* Search à gauche, flexible */}
					<div className="flex-1 min-w-0 max-w-md">{search}</div>
					{/* Children (filtres/actions) à droite, shrink-0 pour éviter le wrap */}
					<div className="flex flex-row items-center gap-3 shrink-0">
						{children}
					</div>
				</div>
			)}

			{/* Mobile: structure collapsible */}
			{isMobile && (
				<>
					{/* Ligne 1: Search + Toggle */}
					<div className="flex items-center gap-3">
						<div className="flex-1 min-w-0">{search}</div>
						<Button
							variant="outline"
							size="icon"
							onClick={toggle}
							disabled={isTogglePending}
							className="shrink-0 h-[44px] w-[44px]"
							aria-expanded={!isCollapsed}
							aria-label={
								isCollapsed ? "Afficher les filtres" : "Masquer les filtres"
							}
						>
							<SlidersHorizontal
								className={cn("h-5 w-5", !isCollapsed && "text-primary")}
							/>
						</Button>
					</div>

					{/* Ligne 2+: Filtres (collapsible) */}
					<AnimatePresence initial={false}>
						{!showCollapsed && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.2 }}
								className="overflow-hidden mt-3"
							>
								<div className="flex flex-col items-stretch gap-3">
									{children}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</>
			)}
		</div>
	);
}

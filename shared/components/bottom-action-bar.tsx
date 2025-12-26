"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Search, ArrowUpDown, SlidersHorizontal } from "lucide-react";

import { useDialog } from "@/shared/providers/dialog-store-provider";
import { QUICK_SEARCH_DIALOG_ID } from "@/shared/components/quick-search-dialog/constants";
import { PRODUCT_FILTER_DIALOG_ID } from "@/modules/products/constants/product.constants";
import { SortDrawer, type SortOption } from "@/shared/components/sort-drawer";
import { cn } from "@/shared/utils/cn";

interface BottomActionBarProps {
	/** Options de tri disponibles */
	sortOptions: SortOption[];
	/** Classes CSS additionnelles */
	className?: string;
}

/** Parametres URL ignores pour le comptage des filtres actifs */
const IGNORED_FILTER_PARAMS = [
	"page",
	"perPage",
	"sortBy",
	"search",
	"cursor",
	"direction",
] as const;

interface ActiveBadgeProps {
	count?: number;
	showDot?: boolean;
}

function ActiveBadge({ count, showDot = false }: ActiveBadgeProps) {
	if (showDot && !count) {
		return (
			<span
				className="absolute top-1.5 right-1/2 translate-x-5 size-2.5 bg-primary rounded-full ring-2 ring-background"
				aria-hidden="true"
			/>
		);
	}
	if (count && count > 0) {
		return (
			<span
				className="absolute -top-0.5 right-1/2 translate-x-6 min-w-[18px] h-[18px] bg-primary text-primary-foreground rounded-full text-[11px] flex items-center justify-center font-semibold px-1 ring-2 ring-background"
				aria-hidden="true"
			>
				{count > 9 ? "9+" : count}
			</span>
		);
	}
	return null;
}

/**
 * Barre d'actions fixe en bas pour mobile.
 *
 * Affiche 3 boutons:
 * - Recherche (ouvre QuickSearchDialog)
 * - Tri (ouvre SortDrawer)
 * - Filtres (ouvre ProductFilterSheet)
 *
 * Visible uniquement sur mobile (md:hidden).
 * Respecte safe-area-inset-bottom pour iPhone X+.
 *
 * Accessibilité:
 * - role="toolbar" avec navigation par flèches gauche/droite
 * - Live region pour annoncer les changements d'état
 * - Touch targets 72px minimum (WCAG 2.5.8)
 */
export function BottomActionBar({ sortOptions, className }: BottomActionBarProps) {
	const [sortOpen, setSortOpen] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const { open: openSearch } = useDialog(QUICK_SEARCH_DIALOG_ID);
	const { open: openFilter } = useDialog(PRODUCT_FILTER_DIALOG_ID);
	const searchParams = useSearchParams();
	const prefersReducedMotion = useReducedMotion();

	// Refs individuelles pour les boutons (ordre: Tri, Recherche, Filtres)
	const sortButtonRef = useRef<HTMLButtonElement>(null);
	const searchButtonRef = useRef<HTMLButtonElement>(null);
	const filterButtonRef = useRef<HTMLButtonElement>(null);
	const buttonRefs = [sortButtonRef, searchButtonRef, filterButtonRef];

	// Calculer si recherche active
	const hasActiveSearch = searchParams.has("search") && searchParams.get("search") !== "";

	// Calculer si tri actif
	const hasActiveSort = searchParams.has("sortBy");

	// Calculer le nombre de filtres actifs (compte toutes les valeurs, pas seulement les clés)
	const activeFiltersCount = Array.from(searchParams.entries()).filter(
		([key]) => !IGNORED_FILTER_PARAMS.includes(key as (typeof IGNORED_FILTER_PARAMS)[number])
	).length;

	const hasActiveFilters = activeFiltersCount > 0;

	// Annonce pour screen readers (calculee directement)
	const announcement = [
		hasActiveSearch && `Recherche "${searchParams.get("search")}" active`,
		hasActiveSort && "Tri actif",
		hasActiveFilters &&
			`${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}`,
	]
		.filter(Boolean)
		.join(". ");

	// Navigation clavier pour toolbar (flèches gauche/droite)
	const handleToolbarKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
		const buttonCount = 3;
		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowRight":
			case "ArrowDown":
				e.preventDefault();
				nextIndex = (currentIndex + 1) % buttonCount;
				break;
			case "ArrowLeft":
			case "ArrowUp":
				e.preventDefault();
				nextIndex = (currentIndex - 1 + buttonCount) % buttonCount;
				break;
			case "Home":
				e.preventDefault();
				nextIndex = 0;
				break;
			case "End":
				e.preventDefault();
				nextIndex = buttonCount - 1;
				break;
		}

		if (nextIndex !== null) {
			setFocusedIndex(nextIndex);
			buttonRefs[nextIndex].current?.focus();
		}
	};

	// Style commun pour les boutons
	const buttonClassName = cn(
		"flex-1 min-w-[72px] flex flex-col items-center justify-center gap-1",
		"h-full min-h-14", // 56px - Material Design 3 touch target
		"text-muted-foreground hover:text-foreground",
		"transition-colors duration-200",
		"active:scale-95 active:bg-primary/10", // Couleur ajoutee pour feedback visuel
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
		"relative"
	);

	const iconClassName = "size-5";
	const labelClassName = "text-xs font-medium"; // 12px au lieu de 11px

	return (
		<>
			<motion.div
				initial={prefersReducedMotion ? false : { y: 100, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ type: "spring", damping: 25, stiffness: 300 }}
				className={cn(
					// Mobile only
					"md:hidden",
					// Position fixe en bas
					"fixed bottom-0 left-0 right-0 z-50",
					// Safe area pour iPhone X+
					"pb-[env(safe-area-inset-bottom)]",
					// Style
					"bg-background/95 backdrop-blur-md",
					"border-t border-x border-border",
					"rounded-t-2xl",
					"shadow-[0_-4px_20px_rgba(0,0,0,0.08)]",
					className
				)}
			>
				<div
					role="toolbar"
					aria-label="Actions rapides"
					className="flex items-stretch h-14"
				>
					{/* Tri */}
					<button
						ref={sortButtonRef}
						type="button"
						onClick={() => setSortOpen(true)}
						onKeyDown={(e) => handleToolbarKeyDown(e, 0)}
						tabIndex={focusedIndex === 0 ? 0 : -1}
						className={buttonClassName}
						aria-label={hasActiveSort ? "Tri actif. Modifier le tri" : "Ouvrir les options de tri"}
					>
						<ArrowUpDown className={iconClassName} aria-hidden="true" />
						<span className={labelClassName}>Trier</span>
						<ActiveBadge showDot={hasActiveSort} />
					</button>

					{/* Recherche */}
					<button
						ref={searchButtonRef}
						type="button"
						onClick={() => openSearch()}
						onKeyDown={(e) => handleToolbarKeyDown(e, 1)}
						tabIndex={focusedIndex === 1 ? 0 : -1}
						className={buttonClassName}
						aria-label={
							hasActiveSearch
								? `Recherche: "${searchParams.get("search")}". Modifier la recherche`
								: "Ouvrir la recherche"
						}
					>
						<Search className={iconClassName} aria-hidden="true" />
						<span className={labelClassName}>Recherche</span>
						<ActiveBadge showDot={hasActiveSearch} />
					</button>

					{/* Filtres */}
					<button
						ref={filterButtonRef}
						type="button"
						onClick={() => openFilter()}
						onKeyDown={(e) => handleToolbarKeyDown(e, 2)}
						tabIndex={focusedIndex === 2 ? 0 : -1}
						className={buttonClassName}
						aria-label={
							hasActiveFilters
								? `${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}. Modifier les filtres`
								: "Ouvrir les filtres"
						}
					>
						<SlidersHorizontal className={iconClassName} aria-hidden="true" />
						<span className={labelClassName}>Filtres</span>
						<ActiveBadge count={activeFiltersCount} />
					</button>

				</div>

				{/* Live region pour screen readers */}
				<span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
					{announcement}
				</span>
			</motion.div>

			{/* SortDrawer */}
			<SortDrawer
				open={sortOpen}
				onOpenChange={setSortOpen}
				options={sortOptions}
				showResetOption
			/>
		</>
	);
}

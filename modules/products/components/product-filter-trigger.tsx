"use client";

import { Filter } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { PRODUCT_FILTER_DIALOG_ID } from "@/modules/products/constants/product.constants";
import { cn } from "@/shared/utils/cn";
import {
	countActiveFilters,
	isProductCategoryPage,
} from "@/modules/products/services/product-filter-params.service";

interface ProductFilterTriggerProps {
	className?: string;
	/**
	 * Variante d'affichage :
	 * - "icon" : bouton icone seul (style mobile, comme SortDrawerTrigger)
	 * - "full" : bouton avec texte et badge (style desktop)
	 */
	variant?: "icon" | "full";
}

/**
 * Bouton trigger pour ouvrir le ProductFilterSheet
 *
 * Utilise Zustand pour ouvrir le sheet via le meme dialog ID.
 * Affiche un indicateur si des filtres sont actifs.
 *
 * @example
 * ```tsx
 * // Mobile - style icon comme SortDrawerTrigger
 * <ProductFilterTrigger variant="icon" className="md:hidden" />
 *
 * // Desktop - style full avec texte
 * <ProductFilterTrigger variant="full" className="hidden md:flex" />
 * ```
 */
export function ProductFilterTrigger({ className, variant = "full" }: ProductFilterTriggerProps) {
	const { open } = useDialog(PRODUCT_FILTER_DIALOG_ID);
	const searchParams = useSearchParams();
	const pathname = usePathname();

	const { activeFiltersCount: urlFiltersCount, hasActiveFilters: urlHasActiveFilters } =
		countActiveFilters(searchParams);

	// Add 1 if on a category page (type is in the path, not in query params)
	const isOnCategoryPage = isProductCategoryPage(pathname);
	const activeFiltersCount = urlFiltersCount + (isOnCategoryPage ? 1 : 0);
	const hasActiveFilters = urlHasActiveFilters || isOnCategoryPage;

	// Variante icon (mobile) - meme style que SortDrawerTrigger
	if (variant === "icon") {
		return (
			<Button
				variant="ghost"
				size="icon"
				onClick={() => open()}
				className={cn("relative size-11", className)}
				aria-label={`Filtres${hasActiveFilters ? ` (${activeFiltersCount} actifs)` : ""}`}
			>
				<Filter className="size-5" />
				{hasActiveFilters && (
					<span
						className="bg-primary ring-background absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2"
						aria-hidden="true"
					/>
				)}
			</Button>
		);
	}

	// Variante full (desktop) - style original avec texte et badge
	return (
		<Button
			variant="outline"
			onClick={() => open()}
			className={cn(
				"relative h-11 gap-2 px-3",
				"border-border/60 hover:border-border hover:bg-accent/50 transition-all duration-200",
				hasActiveFilters && "border-primary/30 bg-primary/5",
				className,
			)}
			aria-label={`Filtres${hasActiveFilters ? ` (${activeFiltersCount} actifs)` : ""}`}
		>
			<Filter className="h-4 w-4" />
			<span>Filtres</span>
			{hasActiveFilters && (
				<Badge
					variant="secondary"
					className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center p-0 text-xs font-bold"
				>
					{activeFiltersCount}
				</Badge>
			)}
		</Button>
	);
}

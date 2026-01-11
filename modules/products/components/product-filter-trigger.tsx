"use client";

import { Filter } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { PRODUCT_FILTER_DIALOG_ID } from "@/modules/products/constants/product.constants";
import { cn } from "@/shared/utils/cn";

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

	// Calculer le nombre de filtres actifs depuis l'URL
	const activeFiltersCount = (() => {
		let count = 0;
		searchParams.forEach((_, key) => {
			if (["page", "perPage", "sortBy", "search", "cursor", "direction"].includes(key)) {
				return;
			}
			if (key === "type" || key === "color" || key === "material") {
				count += 1;
			} else if (key === "priceMin") {
				count += 1;
			} else if (key === "rating") {
				count += 1;
			}
		});
		return count;
	})();

	const hasActiveFilters = activeFiltersCount > 0;

	// Variante icon (mobile) - meme style que SortDrawerTrigger
	if (variant === "icon") {
		return (
			<Button
				variant="ghost"
				size="icon"
				onClick={() => open()}
				className={cn("size-11 relative", className)}
				aria-label={`Filtres${hasActiveFilters ? ` (${activeFiltersCount} actifs)` : ""}`}
			>
				<Filter className="size-5" />
				{hasActiveFilters && (
					<span
						className="absolute -top-0.5 -right-0.5 size-3 bg-primary rounded-full ring-2 ring-background"
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
				"relative h-11 px-3 gap-2",
				"border-border/60 hover:border-border hover:bg-accent/50 transition-all duration-200",
				hasActiveFilters && "border-primary/30 bg-primary/5",
				className
			)}
			aria-label={`Filtres${hasActiveFilters ? ` (${activeFiltersCount} actifs)` : ""}`}
		>
			<Filter className="w-4 h-4" />
			<span>Filtres</span>
			{hasActiveFilters && (
				<Badge
					variant="secondary"
					className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold bg-primary text-primary-foreground"
				>
					{activeFiltersCount}
				</Badge>
			)}
		</Button>
	);
}

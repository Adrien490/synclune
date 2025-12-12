"use client";

import { Filter } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { PRODUCT_FILTER_DIALOG_ID } from "./product-filter-fab";
import { cn } from "@/shared/utils/cn";

interface ProductFilterTriggerProps {
	className?: string;
}

/**
 * Bouton trigger pour ouvrir le ProductFilterSheet
 *
 * Utilise Zustand pour ouvrir le sheet via le meme dialog ID.
 * Affiche un badge avec le nombre de filtres actifs.
 *
 * @example
 * ```tsx
 * <ProductFilterTrigger className="hidden md:flex" />
 * ```
 */
export function ProductFilterTrigger({ className }: ProductFilterTriggerProps) {
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
			}
		});
		return count;
	})();

	return (
		<Button
			variant="outline"
			onClick={() => open()}
			className={cn(
				"relative h-[44px] w-11 p-0",
				"sm:w-auto sm:px-3 sm:gap-2",
				"border-border/60 hover:border-border hover:bg-accent/50 transition-all duration-200",
				activeFiltersCount > 0 && "border-primary/30 bg-primary/5",
				className
			)}
			aria-label={`Filtres${activeFiltersCount > 0 ? ` (${activeFiltersCount} actifs)` : ""}`}
		>
			<Filter className="w-4 h-4" />
			<span className="hidden sm:inline">Filtres</span>
			{activeFiltersCount > 0 && (
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

"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/utils/cn";
import { Check, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface ProductsQuickFiltersProps {
	className?: string;
}

/**
 * Dropdown de filtres rapides pour les produits
 * Filtres : Tous, En rupture, Prix < 50€
 */
export function ProductsQuickFilters({ className }: ProductsQuickFiltersProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const applyQuickFilter = (filterParams: Record<string, string>) => {
		const params = new URLSearchParams(searchParams.toString());

		// Supprimer tous les filtres existants
		const filterKeys = [
			"filter_stockStatus",
			"filter_priceMin",
			"filter_priceMax",
			"filter_typeId",
			"filter_collectionId",
			"filter_isPublished",
			"filter_publishedAfter",
			"filter_publishedBefore",
		];
		filterKeys.forEach((key) => params.delete(key));

		// Ajouter les nouveaux filtres
		Object.entries(filterParams).forEach(([key, value]) => {
			if (value) {
				params.set(key, value);
			}
		});

		// Reset pagination
		params.set("page", "1");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const clearAllFilters = () => {
		const params = new URLSearchParams(searchParams.toString());

		const filterKeys = [
			"filter_stockStatus",
			"filter_priceMin",
			"filter_priceMax",
			"filter_typeId",
			"filter_collectionId",
			"filter_isPublished",
			"filter_publishedAfter",
			"filter_publishedBefore",
		];
		filterKeys.forEach((key) => params.delete(key));
		params.set("page", "1");

		startTransition(() => {
			router.push(`?${params.toString()}`, { scroll: false });
		});
	};

	const quickFilters = [
		{
			label: "Tous les bijoux",
			value: null,
			onClick: clearAllFilters,
		},
		{
			label: "En rupture de stock",
			value: "out_of_stock",
			onClick: () => applyQuickFilter({ filter_stockStatus: "out_of_stock" }),
		},
		{
			label: "Prix moins de 50€",
			value: "price_under_50",
			onClick: () =>
				applyQuickFilter({ filter_priceMin: "0", filter_priceMax: "5000" }),
		},
	];

	// Determine which filter is active
	const getActiveFilter = (): string | null => {
		const hasAnyFilter = Array.from(searchParams.keys()).some((key) =>
			key.startsWith("filter_")
		);

		if (!hasAnyFilter) return null;

		// Check for out of stock
		if (
			searchParams.get("filter_stockStatus") === "out_of_stock" &&
			searchParams.getAll("filter_stockStatus").length === 1 &&
			!searchParams.get("filter_priceMax")
		) {
			return "out_of_stock";
		}

		// Check for price under 50
		if (
			searchParams.get("filter_priceMax") === "5000" &&
			searchParams.get("filter_priceMin") === "0" &&
			!searchParams.get("filter_stockStatus")
		) {
			return "price_under_50";
		}

		return "custom";
	};

	const activeFilter = getActiveFilter();
	const activeFilterLabel =
		quickFilters.find((f) => f.value === activeFilter)?.label || "Tous les bijoux";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					disabled={isPending}
					className={cn(
						"min-h-10 sm:min-h-11 gap-2 text-sm font-medium border-border/60 hover:border-border hover:bg-accent/30 hover:border-accent/50 transition-all duration-200",
						className
					)}
				>
					{activeFilterLabel}
					<ChevronDown className="ml-2 h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-56">
				<DropdownMenuLabel>Filtres rapides</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{quickFilters.map((filter) => {
					const isActive =
						filter.value === null
							? activeFilter === null
							: activeFilter === filter.value;

					return (
						<DropdownMenuItem key={filter.label} onClick={filter.onClick}>
							<Check
								className={`mr-2 h-4 w-4 ${isActive ? "opacity-100" : "opacity-0"}`}
							/>
							{filter.label}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

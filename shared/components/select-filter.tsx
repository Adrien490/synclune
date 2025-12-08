"use client";

import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/utils/cn";
import { ArrowUpDown, X } from "lucide-react";
import { useSelectFilter } from "@/shared/hooks/use-select-filter";
import type { ReactNode } from "react";

export type FilterOption = {
	value: string;
	label: string;
};

export interface SelectFilterProps {
	filterKey: string;
	label: string;
	options: FilterOption[];
	placeholder?: string;
	className?: string;
	maxHeight?: number;
	/**
	 * Mode compact sur mobile - affiche uniquement une icône
	 * Le comportement desktop reste inchangé
	 * @default false
	 */
	compactMobile?: boolean;
	/**
	 * Icône à afficher en mode compact (défaut: ArrowUpDown)
	 */
	compactIcon?: ReactNode;
	/**
	 * Aria-label pour le bouton en mode compact
	 */
	compactAriaLabel?: string;
}

export function SelectFilter({
	filterKey,
	label,
	options,
	placeholder = "Sélectionner...",
	className,
	maxHeight = 250,
	compactMobile = false,
	compactIcon,
	compactAriaLabel,
}: SelectFilterProps) {
	const { value, setFilter, clearFilter, isPending } =
		useSelectFilter(filterKey);

	// Gérer le changement de valeur
	const handleSelect = (value: string) => {
		setFilter(value);
	};

	// Gérer la réinitialisation
	const handleClear = () => {
		clearFilter();
	};

	return (
		<div
			data-pending={isPending ? "" : undefined}
			className={cn(
				"relative",
				!compactMobile && "min-w-[180px]",
				className
			)}
			aria-live="polite"
			aria-busy={isPending}
		>
			{isPending && (
				<span className="sr-only">Chargement des résultats du filtre...</span>
			)}
			<div className="relative flex items-center gap-2">
				<Select
					value={value || ""}
					onValueChange={handleSelect}
					disabled={isPending}
				>
					<SelectTrigger
						className={cn(
							"flex-1 h-[44px]!",
							compactMobile && "w-11 sm:w-auto sm:min-w-[180px]"
						)}
						aria-label={compactMobile ? compactAriaLabel : undefined}
					>
						{/* Label - masqué sur mobile en mode compact */}
						<span
							className={cn(
								"text-muted-foreground text-xs mr-2",
								compactMobile && "hidden sm:inline"
							)}
						>
							{label}
						</span>

						{/* Value - masqué sur mobile en mode compact */}
						<div className={cn("flex-1", compactMobile && "hidden sm:block")}>
							<SelectValue placeholder={placeholder} />
						</div>

						{/* Icône mobile - visible seulement sur mobile en mode compact */}
						{compactMobile && (
							<div className="sm:hidden flex items-center justify-center">
								{compactIcon || <ArrowUpDown className="h-4 w-4" />}
							</div>
						)}
					</SelectTrigger>
					<SelectContent>
						<ScrollArea
							className="w-full"
							style={{ maxHeight: `${maxHeight}px` }}
						>
							{options.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</ScrollArea>
					</SelectContent>
				</Select>
				{value && (
					<button
						type="button"
						aria-label={`Effacer le filtre ${label}`}
						className={cn(
							"h-8 w-8 p-0 rounded-full inline-flex items-center justify-center cursor-pointer hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-ring transition-colors shrink-0",
							compactMobile && "hidden sm:inline-flex"
						)}
						onClick={handleClear}
						disabled={isPending}
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>
		</div>
	);
}

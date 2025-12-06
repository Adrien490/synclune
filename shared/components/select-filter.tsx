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
import { X } from "lucide-react";
import { useSelectFilter } from "@/shared/hooks/use-select-filter";

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
}

export function SelectFilter({
	filterKey,
	label,
	options,
	placeholder = "Sélectionner...",
	className,
	maxHeight = 250,
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
			className={cn("min-w-[180px] relative", className)}
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
					<SelectTrigger className="flex-1 h-[44px]!">
						<span className="text-muted-foreground text-xs mr-2">{label}</span>
						<div className="flex-1">
							<SelectValue placeholder={placeholder} />
						</div>
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
						className="h-8 w-8 p-0 rounded-full inline-flex items-center justify-center cursor-pointer hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-ring transition-colors shrink-0"
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

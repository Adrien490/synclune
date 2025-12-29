"use client"

import { Button } from "@/shared/components/ui/button"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select"
import { cn } from "@/shared/utils/cn"
import { ArrowUpDown, X } from "lucide-react"
import { useSelectFilter } from "@/shared/hooks/use-select-filter"
import type { FilterOption } from "@/shared/types/pagination.types"
import type { SelectFilterProps } from "@/shared/types/component.types"

export type { FilterOption } from "@/shared/types/pagination.types"
export type { SelectFilterProps };

export function SelectFilter({
	filterKey,
	label,
	options,
	placeholder = "Sélectionner...",
	className,
	maxHeight = 400,
	noPrefix = false,
}: SelectFilterProps) {
	const { value, setFilter, clearFilter, isPending } =
		useSelectFilter(filterKey, { noPrefix });

	// Filtrer les options avec value vide (requis par Radix SelectItem)
	const validOptions = options.filter((opt) => opt.value.length > 0);

	const handleSelect = (newValue: string) => {
		setFilter(newValue);
	};

	const handleClear = () => {
		clearFilter();
	};

	return (
		<div
			data-pending={isPending ? "" : undefined}
			className={cn(
				"relative transition-opacity",
				isPending && "opacity-70 pointer-events-none",
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
							// Mobile: icône seule, Desktop: largeur normale
							"w-11 sm:w-auto sm:min-w-[180px]",
							// Masquer le ChevronDown sur mobile
							"[&>[data-slot=select-icon]]:hidden sm:[&>[data-slot=select-icon]]:flex"
						)}
						aria-label={label}
					>
						{/* Label - masqué sur mobile */}
						<span className="text-muted-foreground text-xs mr-2 hidden sm:inline">
							{label}
						</span>

						{/* Value - masqué sur mobile */}
						<div className="flex-1 hidden sm:block">
							<SelectValue placeholder={placeholder} />
						</div>

						{/* Icône mobile avec indicateur de valeur active */}
						<div className="sm:hidden flex items-center justify-center gap-1">
							<ArrowUpDown className="h-4 w-4" />
							{value && (
								<span
									className="w-1.5 h-1.5 rounded-full bg-primary"
									aria-hidden="true"
								/>
							)}
						</div>
					</SelectTrigger>
					<SelectContent>
						<ScrollArea
							className="w-full"
							style={{ maxHeight: `${maxHeight}px` }}
						>
							{validOptions.length === 0 ? (
								<div className="py-6 text-center text-sm text-muted-foreground">
									Aucune option disponible
								</div>
							) : (
								validOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))
							)}
						</ScrollArea>
					</SelectContent>
				</Select>
				{value && (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label={`Effacer le filtre ${label}`}
						className="h-8 w-8 rounded-full shrink-0"
						onClick={handleClear}
						disabled={isPending}
					>
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	);
}

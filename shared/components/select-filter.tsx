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
import { useRef } from "react"
import { useSelectFilter } from "@/shared/hooks/use-select-filter"
import type { FilterOption, SelectFilterProps } from "@/shared/types/component.types"

export type { FilterOption } from "@/shared/types/component.types"
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
	const triggerRef = useRef<HTMLButtonElement>(null);

	// Filter out empty-value options (required by Radix SelectItem)
	const validOptions = options.filter((opt) => opt.value.length > 0);

	// Resolve the selected option for label display and stale value detection
	const selectedOption = validOptions.find((opt) => opt.value === value);

	const handleClear = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		clearFilter();
		triggerRef.current?.focus();
	};

	return (
		<div
			data-pending={isPending ? "" : undefined}
			className={cn(
				"relative transition-opacity",
				isPending && "opacity-70 pointer-events-none",
				className
			)}
			aria-atomic="true"
			aria-busy={isPending}
		>
			<div className="relative flex items-center gap-2">
				<Select
					value={value || ""}
					onValueChange={setFilter}
					disabled={isPending}
				>
					<SelectTrigger
						ref={triggerRef}
						className={cn(
							"flex-1 h-11!",
							// Mobile: icon only, Desktop: normal width
							"w-11 sm:w-auto sm:min-w-45",
							// Hide ChevronDown on mobile
							"[&>[data-slot=select-icon]]:hidden sm:[&>[data-slot=select-icon]]:flex"
						)}
						aria-label={label}
					>
						{/* Label - hidden on mobile */}
						<span className="text-muted-foreground text-xs mr-2 hidden sm:inline">
							{label}
						</span>

						{/* Value - hidden on mobile */}
						<div className="flex-1 hidden sm:block">
							<SelectValue placeholder={placeholder} />
						</div>

						{/* Mobile icon with active value indicator */}
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
					<SelectContent className="max-w-[calc(100vw-2rem)]">
						<ScrollArea
							className="w-full"
							style={{ maxHeight: `min(${maxHeight}px, 60vh)` }}
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
						aria-label={`Effacer le filtre ${selectedOption?.label || label}`}
						title={`Effacer le filtre ${selectedOption?.label || label}`}
						className="h-8 w-8 rounded-full shrink-0"
						onClick={handleClear}
						disabled={isPending}
					>
						<X className="h-4 w-4" />
					</Button>
				)}
			</div>

			{/* Live region for screen readers */}
			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{isPending && value && (
					<span>
						Chargement des résultats pour le filtre {label} : {selectedOption?.label}
					</span>
				)}
				{isPending && !value && (
					<span>Chargement des résultats sans filtre {label}</span>
				)}
			</div>
		</div>
	);
}

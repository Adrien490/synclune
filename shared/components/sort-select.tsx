"use client";

import { Button } from "@/shared/components/ui/button";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { useSortSelect } from "@/shared/hooks/use-sort-select";
import type { SortOption } from "@/shared/types/sort.types";
import { cn } from "@/shared/utils/cn";
import { X } from "lucide-react";
import { useRef } from "react";
import type { SortSelectProps } from "@/shared/types/component.types";

export type { SortOption, SortSelectProps };

export function SortSelect({
	label,
	options,
	placeholder = "Sélectionner...",
	className,
	maxHeight = 300,
}: SortSelectProps) {
	const { value, setSort, clearSort, isPending } = useSortSelect();
	const triggerRef = useRef<HTMLButtonElement>(null);

	const handleClear = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		clearSort();
		triggerRef.current?.focus();
	};

	const selectedOption = options.find((opt) => opt.value === value);

	return (
		<div
			data-pending={isPending ? "" : undefined}
			aria-busy={isPending}
			className={cn(
				"relative",
				isPending &&
					"opacity-60 pointer-events-none transition-opacity duration-200",
				className
			)}
		>
			<Select
				value={value || ""}
				onValueChange={setSort}
				disabled={isPending}
			>
				<div className="relative">
					<SelectTrigger
						ref={triggerRef}
						className={cn(
							"min-h-10 sm:min-h-11",
							"overflow-hidden",
							"hover:shadow-sm hover:-translate-y-px transition-all duration-150",
							value ? "pr-18 sm:pr-20" : "pr-10"
						)}
						aria-label={label}
					>
						<div className="flex items-center gap-2 min-w-0 flex-1">
							<span className="text-foreground/70 text-xs sm:text-sm mr-2 shrink-0 whitespace-nowrap">
								{label}
							</span>
							<div className="flex-1 min-w-0">
								<SelectValue
									placeholder={placeholder}
									className="truncate block"
								/>
							</div>
						</div>
					</SelectTrigger>

					{value && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={handleClear}
							disabled={isPending}
							className={cn(
								"absolute right-9 sm:right-10 top-1/2 -translate-y-1/2 z-10",
								"h-[36px] w-[36px] sm:h-[40px] sm:w-[40px]",
								"text-muted-foreground hover:text-foreground",
								"hover:bg-accent/50 active:bg-accent/70"
							)}
							aria-label={`Effacer le tri ${selectedOption?.label || "actuel"}`}
							title={`Effacer le tri ${selectedOption?.label || "actuel"}`}
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>

				<SelectContent
					side="bottom"
					align="end"
					sideOffset={4}
					className="max-w-[calc(100vw-2rem)] sm:max-w-md"
				>
					<ScrollArea
						className="w-full"
						style={{
							maxHeight: `min(${maxHeight}px, 60vh)`,
						}}
					>
						{options.length === 0 ? (
							<div className="py-6 text-center text-sm text-muted-foreground">
								Aucune option disponible
							</div>
						) : (
							options.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))
						)}
					</ScrollArea>
				</SelectContent>
			</Select>

			{/* Live region for screen readers */}
			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{isPending && value && (
					<span>
						Chargement des résultats pour le tri : {selectedOption?.label}
					</span>
				)}
				{isPending && !value && (
					<span>Chargement des résultats par défaut</span>
				)}
			</div>
		</div>
	);
}

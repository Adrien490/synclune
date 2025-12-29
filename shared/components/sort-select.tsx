"use client";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
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
import { useId, useRef } from "react";
import type { SortSelectProps } from "@/shared/types/component.types";

export type { SortOption, SortSelectProps };

export function SortSelect({
	label,
	options,
	placeholder = "Sélectionner...",
	className,
	maxHeight = 300,
	externalLabel = false,
}: SortSelectProps) {
	const { value, setSort, clearSort, isPending } = useSortSelect();
	const triggerRef = useRef<HTMLButtonElement>(null);
	const generatedId = useId();

	const handleSelect = (newValue: string) => {
		setSort(newValue);
	};

	const handleClear = (e: React.MouseEvent | React.KeyboardEvent) => {
		e.preventDefault();
		e.stopPropagation();
		clearSort();
		// Focus management: return focus to trigger after clearing (direct, no useEffect)
		triggerRef.current?.focus();
	};

	const handleClearKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			handleClear(e);
		}
	};

	const selectId = `sort-select-${generatedId}`;
	const selectedOption = options.find((opt) => opt.value === value);

	// Reusable label component to avoid duplication
	const InternalLabel = () => (
		<span className="text-foreground/70 text-xs sm:text-sm mr-2 shrink-0 whitespace-nowrap">
			{label}
		</span>
	);

	return (
		<div
			data-pending={isPending ? "" : undefined}
			className={cn(
				"relative",
				externalLabel && "space-y-2",
				isPending &&
					"opacity-60 pointer-events-none transition-opacity duration-200",
				className
			)}
		>
			{/* External label */}
			{externalLabel && (
				<Label htmlFor={selectId} className="text-sm font-medium">
					{label}
				</Label>
			)}

			<Select
				value={value || ""}
				onValueChange={handleSelect}
				disabled={isPending}
			>
				<div className="relative">
					<SelectTrigger
						id={selectId}
						ref={triggerRef}
						className={cn(
							"min-h-[40px] sm:min-h-[44px]",
							"overflow-hidden",
							"hover:shadow-sm hover:-translate-y-px transition-all duration-150",
							value ? "pr-[72px] sm:pr-[80px]" : "pr-10"
						)}
						aria-label={!externalLabel ? label : undefined}
					>
						<div className="flex items-center gap-2 min-w-0 flex-1">
							{!externalLabel && <InternalLabel />}
							<div className="flex-1 min-w-0">
								<SelectValue
									placeholder={placeholder}
									className="truncate block"
								/>
							</div>
						</div>
					</SelectTrigger>

					{/* Clear button - positioned outside to avoid conflicts with Radix icon */}
					{value && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={handleClear}
							onKeyDown={handleClearKeyDown}
							disabled={isPending}
							className={cn(
								// Positioning
								"absolute right-9 sm:right-10 top-1/2 -translate-y-1/2 z-10",
								// Sizing (WCAG compliant but more compact on mobile)
								"h-[36px] w-[36px] sm:h-[40px] sm:w-[40px]",
								// Styling
								"text-muted-foreground hover:text-foreground",
								"hover:bg-accent/50 active:bg-accent/70"
							)}
							aria-label={`Effacer le tri ${selectedOption?.label || "actuel"}`}
							title={`Effacer le tri ${selectedOption?.label || "actuel"}`}
							tabIndex={0}
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
					style={{
						maxHeight: `min(${maxHeight}px, 60vh)`,
					}}
				>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
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

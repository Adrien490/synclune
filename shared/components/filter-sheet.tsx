"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import { cn } from "@/shared/utils/cn";
import { Filter, Loader2, X } from "lucide-react";
import { ReactNode } from "react";

export interface FilterSheetWrapperProps {
	/** Number of active filters to display in badge */
	activeFiltersCount?: number;
	/** Whether there are any active filters */
	hasActiveFilters?: boolean;
	/** Callback to clear all filters */
	onClearAll?: () => void;
	/** Children (form content) */
	children: ReactNode;
	/** Callback when filters are applied */
	onApply?: () => void;
	/** Whether the operation is pending */
	isPending?: boolean;
	/** Custom trigger button className */
	triggerClassName?: string;
	/** Sheet title */
	title?: string;
	/** Sheet description */
	description?: string;
	/** Custom apply button text */
	applyButtonText?: string;
	/** Custom cancel button text */
	cancelButtonText?: string;
	/** Show cancel button */
	showCancelButton?: boolean;
}

export function FilterSheetWrapper({
	activeFiltersCount = 0,
	hasActiveFilters = false,
	onClearAll,
	children,
	onApply,
	isPending = false,
	triggerClassName,
	title = "Filtres",
	description = "Affine ta recherche",
	applyButtonText = "Appliquer",
	cancelButtonText = "Annuler",
	showCancelButton = true,
}: FilterSheetWrapperProps) {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"relative gap-2 text-sm font-medium min-h-[44px] px-4 border-border/60 hover:border-border hover:bg-accent/30 hover:border-accent/50 transition-all duration-200",
						activeFiltersCount > 0 && "border-primary/40 bg-primary/5",
						triggerClassName
					)}
					aria-label={
						activeFiltersCount > 0
							? `Filtres - ${activeFiltersCount} actif${activeFiltersCount > 1 ? "s" : ""}`
							: "Filtres"
					}
				>
					<Filter className="w-4 h-4" aria-hidden="true" />
					<span>Filtres</span>
					{activeFiltersCount > 0 && (
						<>
							<Badge
								variant="default"
								className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold animate-in zoom-in-50 duration-300"
								aria-hidden="true"
							>
								{activeFiltersCount}
							</Badge>
							<span className="sr-only" aria-live="polite">
								{activeFiltersCount} filtre{activeFiltersCount > 1 ? "s" : ""} actif
								{activeFiltersCount > 1 ? "s" : ""}
							</span>
						</>
					)}
				</Button>
			</SheetTrigger>

			<SheetContent
				side="right"
				className="w-full sm:w-[400px] md:w-[440px] p-0 flex flex-col h-full"
				aria-describedby="filter-sheet-description"
			>
				<SheetHeader className="px-6 py-4 border-b bg-background/95 shrink-0">
					<div className="flex items-center justify-between gap-4">
						<div className="min-w-0 flex-1">
							<SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
							<SheetDescription
								id="filter-sheet-description"
								className="text-sm text-muted-foreground"
							>
								{description}
							</SheetDescription>
						</div>
						{hasActiveFilters && onClearAll && (
							<Button
								variant="ghost"
								size="sm"
								onClick={onClearAll}
								className="text-xs hover:bg-destructive/10 hover:text-destructive shrink-0 min-h-[36px]"
								aria-label="Effacer tous les filtres"
							>
								<X className="w-3 h-3 mr-1" aria-hidden="true" />
								<span className="hidden sm:inline">Tout effacer</span>
								<span className="sm:hidden">Effacer</span>
							</Button>
						)}
					</div>
				</SheetHeader>

				<ScrollArea className="flex-1 min-h-0">
					<div className="px-6 py-4">{children}</div>
				</ScrollArea>

				<SheetFooter className="px-6 py-4 border-t bg-background/95 shrink-0">
					{showCancelButton ? (
						<ButtonGroup className="w-full" aria-label="Actions de filtrage">
							<SheetClose asChild className="flex-1">
								<Button variant="outline" disabled={isPending}>
									{cancelButtonText}
								</Button>
							</SheetClose>
							<SheetClose asChild className="flex-1">
								<Button type="button" onClick={onApply} disabled={isPending}>
									{isPending && (
										<Loader2
											className="h-4 w-4 animate-spin"
											aria-hidden="true"
										/>
									)}
									{applyButtonText}
								</Button>
							</SheetClose>
						</ButtonGroup>
					) : (
						<SheetClose asChild className="w-full">
							<Button
								type="button"
								onClick={onApply}
								disabled={isPending}
								className="w-full"
							>
								{isPending && (
									<Loader2
										className="h-4 w-4 animate-spin"
										aria-hidden="true"
									/>
								)}
								{applyButtonText}
							</Button>
						</SheetClose>
					)}
				</SheetFooter>

				{/* Live region for screen readers */}
				<div role="status" aria-live="polite" className="sr-only">
					{isPending && "Mise à jour des filtres en cours..."}
				</div>
			</SheetContent>
		</Sheet>
	);
}

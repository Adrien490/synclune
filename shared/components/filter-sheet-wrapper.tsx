"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import { cn } from "@/shared/utils/cn";
import { Filter, Loader2, X } from "lucide-react";
import type { FilterSheetWrapperProps } from "@/shared/types/component.types";

export type { FilterSheetWrapperProps };

export function FilterSheetWrapper({
	activeFiltersCount = 0,
	hasActiveFilters = false,
	onClearAll,
	children,
	onApply,
	isPending = false,
	triggerClassName,
	title = "Filtres",
	description,
	applyButtonText = "Appliquer",
	cancelButtonText = "Annuler",
	showCancelButton = true,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
	trigger,
	hideTrigger = false,
}: FilterSheetWrapperProps) {
	// Note: Ne pas utiliser de fallback pour permettre le mode uncontrolled
	// Si controlledOpen est undefined, Vaul gère l'état en interne

	const handleApply = () => {
		onApply?.();
		controlledOnOpenChange?.(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		// Cmd+Enter (Mac) ou Ctrl+Enter (Windows) pour appliquer
		if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			handleApply();
		}
	};

	// Default trigger button
	const defaultTrigger = (
		<Button
			variant="outline"
			className={cn(
				"relative gap-2 text-sm font-medium min-h-11 px-4 border-border/60 hover:border-border hover:bg-accent/30 hover:border-accent/50 transition-all duration-200",
				activeFiltersCount > 0 &&
					"border-primary/50 bg-primary/5 shadow-sm shadow-primary/10",
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
						className="absolute -top-2.5 -right-2.5 h-5 min-w-5 flex items-center justify-center px-1 text-xs font-bold animate-in zoom-in-50 duration-200 shadow-sm"
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
	);

	return (
		<Sheet direction="right" open={controlledOpen} onOpenChange={controlledOnOpenChange}>
			{!hideTrigger && (
				<SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>
			)}

			<SheetContent
				className="w-full sm:w-100 md:w-110 p-0 flex flex-col h-full"
				onKeyDown={handleKeyDown}
			>
				<SheetHeader
					className="px-6 py-5 border-b border-primary/10 bg-linear-to-r from-background via-primary/[0.02] to-background shrink-0"
					role="banner"
					aria-labelledby="filter-sheet-title"
				>
					<div className="flex items-center justify-between gap-4">
						<div className="space-y-0.5">
							<SheetTitle
								id="filter-sheet-title"
								className="text-lg font-semibold font-serif tracking-tight"
							>
								{title}
							</SheetTitle>
							{description && (
								<p className="text-sm text-muted-foreground">{description}</p>
							)}
						</div>
						{hasActiveFilters && onClearAll && (
							<Button
								variant="ghost"
								size="sm"
								onClick={onClearAll}
								className="text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 min-h-9 transition-colors"
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
					<div
						className={cn(
							"px-6 py-4 transition-opacity duration-200",
							isPending && "opacity-50 pointer-events-none"
						)}
						role="region"
						aria-label="Options de filtrage"
						aria-busy={isPending}
					>
						{children}
					</div>
					{/* Gradient indicateur de scroll */}
					<div
						className="pointer-events-none sticky bottom-0 h-8 bg-linear-to-t from-background to-transparent"
						aria-hidden="true"
					/>
				</ScrollArea>

				<SheetFooter className="px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-primary/10 bg-background shrink-0">
					{showCancelButton ? (
						<>
							{/* Mobile: boutons empilés */}
							<div className="flex flex-col gap-2 sm:hidden">
								<Button
									type="button"
									onClick={handleApply}
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
								<SheetClose asChild>
									<Button variant="secondary" className="w-full">
										{cancelButtonText}
									</Button>
								</SheetClose>
							</div>
							{/* Desktop: groupe de boutons */}
							<ButtonGroup className="hidden sm:flex w-full" aria-label="Actions de filtrage">
								<SheetClose asChild className="flex-1">
									<Button variant="secondary" disabled={isPending}>
										{cancelButtonText}
									</Button>
								</SheetClose>
								<Button
									type="button"
									onClick={handleApply}
									disabled={isPending}
									className="flex-1"
								>
									{isPending && (
										<Loader2
											className="h-4 w-4 animate-spin"
											aria-hidden="true"
										/>
									)}
									{applyButtonText}
								</Button>
							</ButtonGroup>
						</>
					) : (
						<Button
							type="button"
							onClick={handleApply}
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

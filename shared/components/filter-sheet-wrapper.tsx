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
	SheetDescription,
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
				"border-border/60 hover:border-border hover:bg-accent/30 hover:border-accent/50 relative min-h-11 gap-2 px-4 text-sm font-medium transition-all duration-200",
				activeFiltersCount > 0 && "border-primary/50 bg-primary/5 shadow-primary/10 shadow-sm",
				triggerClassName,
			)}
			aria-label={
				activeFiltersCount > 0
					? `Filtres - ${activeFiltersCount} actif${activeFiltersCount > 1 ? "s" : ""}`
					: "Filtres"
			}
		>
			<Filter className="h-4 w-4" aria-hidden="true" />
			<span>Filtres</span>
			{activeFiltersCount > 0 && (
				<>
					<Badge
						variant="default"
						className="animate-in zoom-in-50 absolute -top-2.5 -right-2.5 flex h-5 min-w-5 items-center justify-center px-1 text-xs font-bold shadow-sm duration-200"
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
			{!hideTrigger && <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>}

			<SheetContent
				className="flex h-full w-full flex-col overflow-hidden p-0 sm:w-100 md:w-110"
				onKeyDown={handleKeyDown}
				title={title}
				showCloseButton={false}
			>
				<SheetHeader
					className="border-primary/10 from-background via-primary/2 to-background relative shrink-0 border-b bg-linear-to-r px-6 py-5"
					aria-labelledby="filter-sheet-title"
				>
					<div className="flex items-center justify-between gap-4">
						<div className="space-y-0.5">
							<h2
								id="filter-sheet-title"
								className="font-display text-lg font-normal tracking-tight"
							>
								{title}
							</h2>
							{description && (
								<SheetDescription className="text-muted-foreground text-sm">
									{description}
								</SheetDescription>
							)}
						</div>
						<div className="flex shrink-0 items-center gap-1">
							{hasActiveFilters && onClearAll && (
								<Button
									variant="ghost"
									size="sm"
									onClick={onClearAll}
									className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive min-h-9 shrink-0 text-xs transition-colors"
									aria-label="Effacer tous les filtres"
								>
									<X className="mr-1 h-3 w-3" aria-hidden="true" />
									<span className="hidden sm:inline">Tout effacer</span>
									<span className="sm:hidden">Effacer</span>
								</Button>
							)}
							<SheetClose asChild>
								<Button
									variant="ghost"
									size="icon"
									className="text-muted-foreground hover:text-foreground size-9 shrink-0"
									aria-label="Fermer"
								>
									<X className="size-4" />
								</Button>
							</SheetClose>
						</div>
					</div>

					{/* Indeterminate progress bar */}
					{isPending && (
						<div
							className="absolute right-0 bottom-0 left-0 h-0.5 overflow-hidden"
							role="progressbar"
							aria-label="Chargement des filtres"
						>
							<div className="bg-primary h-full w-1/3 animate-[progress-indeterminate_1.5s_ease-in-out_infinite]" />
						</div>
					)}
				</SheetHeader>

				<ScrollArea className="min-h-0 flex-1">
					<div
						className={cn(
							"px-6 py-4 transition-opacity duration-200",
							isPending && "pointer-events-none opacity-50",
						)}
						role="region"
						aria-label="Options de filtrage"
						aria-busy={isPending}
					>
						{children}
					</div>
					{/* Gradient indicateur de scroll */}
					<div
						className="from-background pointer-events-none sticky bottom-0 h-8 bg-linear-to-t to-transparent"
						aria-hidden="true"
					/>
				</ScrollArea>

				<SheetFooter className="border-primary/10 bg-background shrink-0 border-t px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
					{showCancelButton ? (
						<>
							{/* Mobile: bouton unique */}
							<div className="sm:hidden">
								<Button
									type="button"
									onClick={handleApply}
									disabled={isPending}
									className="h-11 w-full text-base"
								>
									{isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
									{applyButtonText}
								</Button>
							</div>
							{/* Desktop: groupe de boutons */}
							<ButtonGroup className="hidden w-full sm:flex" aria-label="Actions de filtrage">
								<SheetClose asChild className="flex-1">
									<Button variant="secondary" disabled={isPending}>
										{cancelButtonText}
									</Button>
								</SheetClose>
								<Button type="button" onClick={handleApply} disabled={isPending} className="flex-1">
									{isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
									{applyButtonText}
								</Button>
							</ButtonGroup>
						</>
					) : (
						<Button type="button" onClick={handleApply} disabled={isPending} className="w-full">
							{isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
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

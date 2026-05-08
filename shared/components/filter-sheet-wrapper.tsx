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
	SheetHandle,
	SheetHeader,
	SheetDescription,
	SheetTrigger,
} from "@/shared/components/ui/sheet";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Kbd } from "@/shared/components/ui/kbd";
import { cn } from "@/shared/utils/cn";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { Filter, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import type { FilterSheetWrapperProps } from "@/shared/types/component.types";

/** Snap point par défaut du bottom-sheet mobile : quasi-fullscreen 92%.
 *  Un seul snap → ouverture directe à 92%, drag vers le bas = dismiss.
 *  Les filtres ont beaucoup de contenu (types/prix/couleurs/matériaux/notes/dispo),
 *  un peek à 50% masquerait la majorité des sections. */
const DEFAULT_MOBILE_SNAP_POINTS: (number | string)[] = [0.92];

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
	onOverlayClick,
	snapPoints,
	confirmClearThreshold = 3,
}: FilterSheetWrapperProps) {
	// Note: Ne pas utiliser de fallback pour permettre le mode uncontrolled
	// Si controlledOpen est undefined, Vaul gère l'état en interne
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	// Tablette portrait (iPad 810×1080, Galaxy Tab) → bottom-sheet plus naturel
	// qu'un right-side sheet de 400px. Desktop ≥1024 paysage inchangé.
	const isTabletPortrait = useMediaQuery(
		"(max-width: 1023px) and (min-width: 768px) and (orientation: portrait)",
	);
	const useBottomSheet = isMobile || isTabletPortrait;

	const [confirmClearOpen, setConfirmClearOpen] = useState(false);

	// Mobile / tablette portrait → bottom-sheet, desktop → right-side sheet
	const direction = useBottomSheet ? "bottom" : "right";
	const effectiveSnapPoints = useBottomSheet
		? (snapPoints ?? DEFAULT_MOBILE_SNAP_POINTS)
		: undefined;

	const handleApply = () => {
		haptic("success");
		onApply?.();
		controlledOnOpenChange?.(false);
	};

	const handleClearAll = () => {
		if (activeFiltersCount >= confirmClearThreshold) {
			haptic("error");
			setConfirmClearOpen(true);
			return;
		}
		haptic("light");
		onClearAll?.();
	};

	const handleConfirmClear = () => {
		haptic("light");
		onClearAll?.();
		setConfirmClearOpen(false);
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
			<Filter className="size-4" aria-hidden="true" />
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
		<Sheet
			direction={direction}
			open={controlledOpen}
			onOpenChange={controlledOnOpenChange}
			snapPoints={effectiveSnapPoints}
		>
			{!hideTrigger && <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>}

			<SheetContent
				className={cn(
					"flex w-full flex-col overflow-hidden p-0",
					// Desktop paysage (right-side sheet) : width constrained, full height
					!useBottomSheet && "h-full sm:w-100 md:w-110",
					// Mobile / tablette portrait (bottom-sheet) : rounded top, native iOS feel
					useBottomSheet && "h-full rounded-t-2xl",
				)}
				onKeyDown={handleKeyDown}
				title={title}
				showCloseButton={false}
				onOverlayClick={onOverlayClick}
				data-pending={isPending ? "" : undefined}
				aria-busy={isPending}
			>
				{/* Vrai Vaul Handle (bottom-sheet only) — draggable, 44px touch area */}
				{useBottomSheet && <SheetHandle />}

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
									onClick={handleClearAll}
									className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive min-h-11 shrink-0 text-xs transition-colors"
									aria-label="Effacer tous les filtres"
								>
									<X className="mr-1 size-3" aria-hidden="true" />
									<span className="hidden md:inline">Tout effacer</span>
									<span className="md:hidden">Effacer</span>
								</Button>
							)}
							<SheetClose asChild>
								<Button
									variant="ghost"
									size="icon"
									className="text-muted-foreground hover:text-foreground size-11 shrink-0"
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
							<div className="bg-primary h-full w-1/3 motion-safe:animate-[progress-indeterminate_1.5s_ease-in-out_infinite]" />
						</div>
					)}
				</SheetHeader>

				<ScrollArea className="min-h-0 flex-1 overscroll-contain">
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
									{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
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
									{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
									{applyButtonText}
									<Kbd className="text-muted-foreground/60 ml-1.5 hidden text-[10px] font-normal lg:inline">
										⌘↵
									</Kbd>
								</Button>
							</ButtonGroup>
						</>
					) : (
						<Button type="button" onClick={handleApply} disabled={isPending} className="w-full">
							{isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
							{applyButtonText}
						</Button>
					)}
				</SheetFooter>

				{/* Live region for screen readers */}
				<div role="status" aria-live="polite" className="sr-only">
					{isPending && "Mise à jour des filtres en cours…"}
				</div>
			</SheetContent>

			<AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Effacer tous les filtres ?</AlertDialogTitle>
						<AlertDialogDescription>
							{activeFiltersCount} filtre{activeFiltersCount > 1 ? "s sont actifs" : " est actif"}.
							Cette action ne peut pas être annulée.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button">Annuler</AlertDialogCancel>
						<AlertDialogAction type="button" onClick={handleConfirmClear}>
							Tout effacer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Sheet>
	);
}

"use client";

import { useDeferredValue, useRef } from "react";
import { CheckSquare } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useBulkSelectionContext } from "@/shared/components/data-table";
import { useEscapeKey } from "@/shared/hooks/use-escape-key";
import { cn } from "@/shared/utils/cn";

import { SelectionModeAnnouncer } from "./selection-mode-announcer";

interface MobileSelectionHeaderProps {
	itemsLabel: { singular: string; plural: string };
	className?: string;
}

/**
 * Header sticky mobile pour le mode "sélection multiple" (pattern Mail iOS).
 *
 * - Mode OFF : bouton "Sélectionner" à droite.
 * - Mode ON  : bouton "Annuler" à gauche, count `aria-live="polite"` au centre,
 *              bouton "Tout sélectionner / Tout désélectionner" à droite. Escape
 *              clavier physique (iPad/laptop) quitte le mode.
 *
 * Sticky top + safe-area-inset-top pour suivre le scroll sur grandes listes.
 * Caché si la liste est vide (`pageItemIds.length === 0`).
 *
 * @example
 * ```tsx
 * <BulkSelectionProvider pageItemIds={products.map(p => p.id)}>
 *   <MobileSelectionHeader itemsLabel={{ singular: "produit", plural: "produits" }} />
 *   ...
 * </BulkSelectionProvider>
 * ```
 */
export function MobileSelectionHeader({ itemsLabel, className }: MobileSelectionHeaderProps) {
	const {
		selectionMode,
		selectedCount,
		selectedOnPage,
		pageItemIds,
		pageState,
		enterSelectionMode,
		exitSelectionMode,
		selectAllVisible,
	} = useBulkSelectionContext();

	const enterButtonRef = useRef<HTMLButtonElement>(null);

	// Restaure le focus sur le bouton « Sélectionner » à la sortie du mode (WCAG 2.4.3).
	// rAF garantit que le DOM a re-render et que le bouton est de nouveau dans l'arbre.
	const handleExit = () => {
		exitSelectionMode();
		requestAnimationFrame(() => enterButtonRef.current?.focus());
	};

	useEscapeKey(handleExit, selectionMode);

	const label = selectedCount > 1 ? itemsLabel.plural : itemsLabel.singular;
	const allOnPageSelected = pageState === "all";
	const hasOffPageSelection = selectedCount > selectedOnPage;

	const countText =
		selectedCount === 0
			? "Aucun élément sélectionné"
			: hasOffPageSelection
				? `${selectedCount} ${label} (${selectedOnPage} sur cette page)`
				: `${selectedCount} ${label} sélectionné${selectedCount > 1 ? "s" : ""}`;

	// Évite le spam d'annonces aria-live au tap rapide en mode sélection (React 19).
	// Hoisté avant les early returns pour respecter les Rules of Hooks.
	const deferredCountText = useDeferredValue(countText);

	if (pageItemIds.length === 0) return null;

	const stickyShell =
		"sticky top-0 z-10 -mx-3 px-3 supports-[backdrop-filter]:bg-background/80 bg-background/95 backdrop-blur pt-[env(safe-area-inset-top)]";

	if (!selectionMode) {
		return (
			<div className={cn(stickyShell, "flex items-center justify-end md:hidden", className)}>
				<SelectionModeAnnouncer />
				<Button
					ref={enterButtonRef}
					type="button"
					variant="outline"
					size="sm"
					onClick={enterSelectionMode}
					className="min-h-11 gap-2 px-3"
					style={{ viewTransitionName: "admin-list-selection-toggle" }}
				>
					<CheckSquare className="size-4" aria-hidden="true" />
					Sélectionner
				</Button>
			</div>
		);
	}

	return (
		<div
			className={cn(
				stickyShell,
				"flex items-center justify-between gap-2 md:hidden",
				"motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150",
				className,
			)}
		>
			<SelectionModeAnnouncer />
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={handleExit}
				className="min-h-11 px-3"
				style={{ viewTransitionName: "admin-list-selection-toggle" }}
			>
				Annuler
			</Button>
			<span aria-live="polite" className="truncate text-sm font-medium">
				{deferredCountText}
			</span>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={selectAllVisible}
				className="min-h-11 px-3"
				aria-pressed={allOnPageSelected}
			>
				{allOnPageSelected ? "Tout désélectionner" : "Tout sélectionner"}
			</Button>
		</div>
	);
}

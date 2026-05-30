"use client";

import { useDeferredValue } from "react";

import { Button } from "@/shared/components/ui/button";
import { formatSelectionCount, useBulkSelectionContext } from "@/shared/components/data-table";
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
 * - Mode OFF : ne rend rien. Le déclencheur « Sélectionner » vit désormais dans
 *              la `StickyActionBar` (à droite du champ de recherche, avec
 *              Filtrer/Trier) via `useSelectionToggleItem` — libère la hauteur
 *              d'écran au-dessus de la liste.
 * - Mode ON  : bouton "Annuler" à gauche, count `aria-live="polite"` au centre,
 *              bouton "Tout sélectionner / Tout désélectionner" à droite. Escape
 *              clavier physique (iPad/laptop) quitte le mode.
 *
 * Sticky top + safe-area-inset-top pour suivre le scroll sur grandes listes.
 * Caché si la liste est vide (`pageItemIds.length === 0`) ou hors mode sélection.
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
		exitSelectionMode,
		selectAllVisible,
	} = useBulkSelectionContext();

	// Le déclencheur d'entrée vit dans la `StickyActionBar` (hors de cet arbre) :
	// la restauration de focus à la sortie n'a plus de cible locale, on quitte
	// simplement le mode (le toggle de la barre reflète l'état via le store).
	useEscapeKey(exitSelectionMode, selectionMode);

	const label = selectedCount > 1 ? itemsLabel.plural : itemsLabel.singular;
	const allOnPageSelected = pageState === "all";
	const hasOffPageSelection = selectedCount > selectedOnPage;

	const countText =
		selectedCount === 0
			? "Aucun élément sélectionné"
			: hasOffPageSelection
				? `${selectedCount} ${label} (${selectedOnPage} sur cette page)`
				: formatSelectionCount(selectedCount, itemsLabel);

	// Évite le spam d'annonces aria-live au tap rapide en mode sélection (React 19).
	// Hoisté avant les early returns pour respecter les Rules of Hooks.
	const deferredCountText = useDeferredValue(countText);

	// Hors mode sélection : rien à rendre. Le bouton « Sélectionner » a migré dans
	// la `StickyActionBar` (à droite de la recherche) — cf. `useSelectionToggleItem`.
	if (pageItemIds.length === 0 || !selectionMode) return null;

	const stickyShell =
		"sticky top-0 z-(--z-bar) -mx-3 px-3 supports-[backdrop-filter]:bg-background/80 bg-background/95 backdrop-blur pt-[env(safe-area-inset-top)]";

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
				onClick={exitSelectionMode}
				className="min-h-11 px-3"
				style={{ viewTransitionName: "admin-list-selection-toggle" }}
				aria-keyshortcuts="Escape"
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

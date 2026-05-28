"use client";

import type { ComponentProps } from "react";

import { useBulkSelectionContextOptional } from "@/shared/components/data-table";
import { cn } from "@/shared/utils/cn";

import { CursorPagination } from "./cursor-pagination";

interface AdminMobileStickyPaginationProps extends ComponentProps<typeof CursorPagination> {
	/** Classes additionnelles appliquées sur le wrapper sticky mobile. */
	wrapperClassName?: string;
}

/**
 * Wrapper sticky de `CursorPagination` pour les listes admin mobile.
 *
 * Comportement :
 * - **Mobile (<md)** : sticky au-dessus de `--bottom-bar-height` (5rem default).
 *   L'admin pagine sans scroller jusqu'au bout d'une longue liste.
 * - **Desktop (≥md)** : masqué — la table desktop a sa propre pagination via
 *   `AdminDataTable`.
 * - **Hide quand `selectionMode` actif** : `MobileSelectionBottomBar` prend la
 *   place (priorité action bulk > navigation pagination). Le wrapper consomme
 *   `useBulkSelectionContextOptional()` — donc requiert d'être rendu à
 *   l'intérieur d'un `<BulkSelectionProvider>` (pattern admin standard).
 *   Hors provider, le wrapper reste toujours visible (fallback non-régressif).
 *
 * Visuel : backdrop-blur + border-top discret pour lisibilité quand le
 * contenu de la liste passe en-dessous au scroll.
 */
export function AdminMobileStickyPagination({
	wrapperClassName,
	...paginationProps
}: AdminMobileStickyPaginationProps) {
	const ctx = useBulkSelectionContextOptional();
	if (ctx?.selectionMode) return null;

	return (
		<div
			data-admin-mobile-sticky-pagination=""
			className={cn(
				"md:hidden",
				"sticky bottom-[var(--bottom-bar-height,5rem)] z-10",
				"border-border/40 bg-background/85 border-t px-4 py-2 backdrop-blur-md",
				wrapperClassName,
			)}
		>
			<CursorPagination {...paginationProps} />
		</div>
	);
}

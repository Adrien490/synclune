"use client";

import type { ComponentProps } from "react";

import { useBulkSelectionContextOptional } from "@/shared/components/data-table";
import { cn } from "@/shared/utils/cn";

import { CursorPagination } from "./cursor-pagination";

interface AdminMobileListPaginationProps extends ComponentProps<typeof CursorPagination> {
	/** Classes additionnelles appliquées sur le wrapper mobile. */
	wrapperClassName?: string;
}

/**
 * Wrapper de `CursorPagination` pour les listes admin mobile.
 *
 * Comportement :
 * - **Mobile (<md)** : rendu en flux normal en bas de la liste.
 * - **Desktop (≥md)** : masqué — la table desktop a sa propre pagination via
 *   `AdminDataTable`.
 * - **Hide quand `selectionMode` actif** : `MobileSelectionBottomBar` prend le
 *   relais visuel — priorité action bulk > navigation pagination. Le wrapper
 *   consomme `useBulkSelectionContextOptional()` — donc requiert d'être rendu
 *   à l'intérieur d'un `<BulkSelectionProvider>` (pattern admin standard).
 *   Hors provider, le wrapper reste toujours visible (fallback non-régressif).
 */
export function AdminMobileListPagination({
	wrapperClassName,
	...paginationProps
}: AdminMobileListPaginationProps) {
	const ctx = useBulkSelectionContextOptional();
	if (ctx?.selectionMode) return null;

	return (
		<div data-admin-mobile-list-pagination className={cn("md:hidden", wrapperClassName)}>
			<CursorPagination {...paginationProps} />
		</div>
	);
}

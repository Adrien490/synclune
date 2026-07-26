"use client";

import type { ComponentProps } from "react";

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
 */
export function AdminMobileListPagination({
	wrapperClassName,
	...paginationProps
}: AdminMobileListPaginationProps) {
	return (
		<div data-admin-mobile-list-pagination className={cn("md:hidden", wrapperClassName)}>
			<CursorPagination {...paginationProps} />
		</div>
	);
}

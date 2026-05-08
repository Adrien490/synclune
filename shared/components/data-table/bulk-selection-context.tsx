"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface BulkSelectionContextValue {
	selectedIds: ReadonlySet<string>;
	pageItemIds: ReadonlyArray<string>;
	selectedCount: number;
	isSelected: (id: string) => boolean;
	toggle: (id: string) => void;
	togglePage: () => void;
	clear: () => void;
	pageState: "none" | "some" | "all";
}

const BulkSelectionContext = createContext<BulkSelectionContextValue | null>(null);

interface BulkSelectionProviderProps {
	pageItemIds: ReadonlyArray<string>;
	children: ReactNode;
}

/**
 * Provider générique de bulk-selection pour les listes admin.
 *
 * `pageItemIds` représente les IDs visibles sur la page courante. La sélection
 * elle-même (`selectedIds`) peut contenir d'autres IDs (sélection persistante
 * cross-pagination), même si le toolbar ne traite que ce qui est visible.
 *
 * Usage : wrap autour de la liste, puis `useBulkSelectionContext()` dans le
 * checkbox de chaque ligne et le toolbar.
 */
export function BulkSelectionProvider({ pageItemIds, children }: BulkSelectionProviderProps) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

	const toggle = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const togglePage = useCallback(() => {
		setSelectedIds((prev) => {
			const allSelected = pageItemIds.length > 0 && pageItemIds.every((id) => prev.has(id));
			const next = new Set(prev);
			if (allSelected) {
				pageItemIds.forEach((id) => next.delete(id));
			} else {
				pageItemIds.forEach((id) => next.add(id));
			}
			return next;
		});
	}, [pageItemIds]);

	const clear = useCallback(() => setSelectedIds(new Set()), []);

	const value = useMemo<BulkSelectionContextValue>(() => {
		const isSelected = (id: string) => selectedIds.has(id);
		const selectedOnPage = pageItemIds.filter((id) => selectedIds.has(id)).length;
		const pageState: "none" | "some" | "all" =
			selectedOnPage === 0 ? "none" : selectedOnPage === pageItemIds.length ? "all" : "some";

		return {
			selectedIds,
			pageItemIds,
			selectedCount: selectedIds.size,
			isSelected,
			toggle,
			togglePage,
			clear,
			pageState,
		};
	}, [selectedIds, pageItemIds, toggle, togglePage, clear]);

	return <BulkSelectionContext.Provider value={value}>{children}</BulkSelectionContext.Provider>;
}

export function useBulkSelectionContext(): BulkSelectionContextValue {
	const ctx = useContext(BulkSelectionContext);
	if (!ctx) {
		throw new Error("useBulkSelectionContext must be used inside <BulkSelectionProvider>");
	}
	return ctx;
}

/**
 * Hook safe — retourne null si pas de provider parent (utile pour composants
 * réutilisés en dehors du contexte bulk).
 */
export function useBulkSelectionContextOptional(): BulkSelectionContextValue | null {
	return useContext(BulkSelectionContext);
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useAdminListSelectionStore } from "@/shared/stores/use-admin-list-selection-store";

interface BulkSelectionContextValue {
	selectedIds: ReadonlySet<string>;
	pageItemIds: ReadonlyArray<string>;
	selectedCount: number;
	/** Nombre d'items sélectionnés appartenant à la page courante. */
	selectedOnPage: number;
	isSelected: (id: string) => boolean;
	toggle: (id: string) => void;
	togglePage: () => void;
	clear: () => void;
	pageState: "none" | "some" | "all";
	/**
	 * Mobile-only "selection mode" flag (pattern Mail iOS).
	 * Desktop ignores this flag (checkboxes always visible in the table header).
	 */
	selectionMode: boolean;
	enterSelectionMode: () => void;
	exitSelectionMode: () => void;
	/**
	 * Sélectionne tous les `pageItemIds` si tous ne sont pas déjà sélectionnés
	 * (mêmes items + ajouts), sinon désélectionne uniquement ceux de la page
	 * (le reste de `selectedIds` cross-page reste intact). **Idempotent / toggle**.
	 * Alias intuitif côté mobile pour `togglePage`.
	 */
	selectAllVisible: () => void;
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
	const [selectionMode, setSelectionMode] = useState(false);

	const toggle = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const togglePage = () => {
		triggerHaptic("selection");
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
	};

	const clear = () => {
		triggerHaptic("selection");
		setSelectedIds(new Set());
		setSelectionMode(false);
	};

	const enterSelectionMode = () => {
		triggerHaptic("selection");
		setSelectionMode(true);
	};

	const exitSelectionMode = () => {
		triggerHaptic("selection");
		setSelectedIds(new Set());
		setSelectionMode(false);
	};

	const isSelected = (id: string) => selectedIds.has(id);
	const selectedOnPage = pageItemIds.filter((id) => selectedIds.has(id)).length;
	const pageState: "none" | "some" | "all" =
		selectedOnPage === 0 ? "none" : selectedOnPage === pageItemIds.length ? "all" : "some";

	const value: BulkSelectionContextValue = {
		selectedIds,
		pageItemIds,
		selectedCount: selectedIds.size,
		selectedOnPage,
		isSelected,
		toggle,
		togglePage,
		clear,
		pageState,
		selectionMode,
		enterSelectionMode,
		exitSelectionMode,
		selectAllVisible: togglePage,
	};

	// Bridge vers `AdminMobileBottomBar` (portalisée au niveau du shell admin) :
	// publie le control courant pour permettre un toggle « Sélection » thumb-friendly
	// dans la bottom-bar globale. Une seule liste est active à la fois sur mobile.
	const pageHasItems = pageItemIds.length > 0;
	useEffect(() => {
		const { register, unregister } = useAdminListSelectionStore.getState();
		register({
			selectionMode,
			pageHasItems,
			enter: enterSelectionMode,
			exit: exitSelectionMode,
		});
		return () => {
			unregister();
		};
	}, [selectionMode, pageHasItems]);

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

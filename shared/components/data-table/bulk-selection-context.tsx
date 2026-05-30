"use client";

import { createContext, use, useEffect, useState } from "react";
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
	/**
	 * Reset selection AND exit selection mode (used after bulk action completes).
	 * Accepte `{ silent: true }` pour skip le haptic feedback — utile en post-success
	 * d'une mutation programmatique où le toast suffit (vibration parasite sinon).
	 */
	clear: (options?: { silent?: boolean }) => void;
	pageState: "none" | "some" | "all";
	/**
	 * Mobile-only "selection mode" flag (pattern Mail iOS).
	 * Desktop ignores this flag (checkboxes always visible in the table header).
	 */
	selectionMode: boolean;
	enterSelectionMode: () => void;
	/**
	 * Toggle selection mode OFF but **keep `selectedIds`** (Mail iOS pattern).
	 * Re-entering the mode restores the previous selection. To wipe the
	 * selection (e.g. after a successful bulk action), call `clear()` instead.
	 */
	exitSelectionMode: () => void;
	/**
	 * Sélectionne tous les `pageItemIds` si tous ne sont pas déjà sélectionnés
	 * (mêmes items + ajouts), sinon désélectionne uniquement ceux de la page
	 * (le reste de `selectedIds` cross-page reste intact). **Idempotent / toggle**.
	 * Alias intuitif côté mobile pour `togglePage`.
	 *
	 * **Note UX :** ne déclenche pas de toast (asymétrie volontaire vs
	 * `extendSelection` qui toast son count). Le count est visible dans le
	 * header sticky + aria-live, le toast serait du bruit ici (action 1-tap
	 * local). `extendSelection` toast car l'admin a explicitement demandé un
	 * fetch cross-page et le résultat (peut-être capé) mérite confirmation.
	 */
	selectAllVisible: () => void;
	/**
	 * Etend la selection en ajoutant des ids hors page (cross-page filter
	 * selection). N'efface pas l'existant — additif uniquement.
	 *
	 * Cas d'usage : banner « Selectionner les 60 produits filtres » qui fetch
	 * via server action les ids matching la query courante puis les wire d'un
	 * coup dans la selection. Idempotent (les ids deja presents sont ignores).
	 */
	extendSelection: (ids: ReadonlyArray<string>) => void;
}

const BulkSelectionContext = createContext<BulkSelectionContextValue | null>(null);

interface BulkSelectionProviderProps {
	pageItemIds: ReadonlyArray<string>;
	children: ReactNode;
	/**
	 * Publie le control de ce provider dans `useAdminListSelectionStore` pour
	 * piloter le toggle « Sélectionner » de la `StickyActionBar` mobile
	 * (cf. `useSelectionToggleItem`). Défaut `true` car la quasi-totalité des
	 * usages directs sont des listes mobiles.
	 *
	 * **⚠️ Slot unique** : le store ne retient qu'UN control à la fois. Sur une
	 * même page, la liste mobile (`md:hidden`) ET la table desktop
	 * (`hidden md:block` via `AdminDataTable`) montent toutes deux un provider —
	 * si les deux bridgent, le dernier effet `register()` écrase l'autre. Sur
	 * mobile, le provider desktop (rendu après dans le JSX) volait le control et
	 * le toggle pilotait alors une liste invisible (« rien ne se passe »).
	 * `AdminDataTable` passe donc `bridgeToToolbar={false}` : la table desktop a
	 * ses propres checkboxes toujours visibles et n'a jamais besoin du toggle.
	 */
	bridgeToToolbar?: boolean;
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
export function BulkSelectionProvider({
	pageItemIds,
	children,
	bridgeToToolbar = true,
}: BulkSelectionProviderProps) {
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

	const clear = (options?: { silent?: boolean }) => {
		if (!options?.silent) {
			triggerHaptic("selection");
		}
		setSelectedIds(new Set());
		setSelectionMode(false);
	};

	const enterSelectionMode = () => {
		triggerHaptic("selection");
		setSelectionMode(true);
	};

	const exitSelectionMode = () => {
		triggerHaptic("selection");
		setSelectionMode(false);
	};

	const extendSelection = (ids: ReadonlyArray<string>) => {
		if (ids.length === 0) return;
		triggerHaptic("medium");
		setSelectedIds((prev) => {
			const next = new Set(prev);
			ids.forEach((id) => next.add(id));
			return next;
		});
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
		extendSelection,
	};

	// Bridge vers `AdminMobileBottomBar` (portalisée au niveau du shell admin) :
	// publie le control courant pour permettre un toggle « Sélection » thumb-friendly
	// dans la bottom-bar globale. Une seule liste est active à la fois sur mobile.
	const pageHasItems = pageItemIds.length > 0;
	useEffect(() => {
		// Slot unique : seul le provider mobile bridge. La table desktop opte-out
		// (`bridgeToToolbar={false}`) pour ne pas écraser le control mobile.
		if (!bridgeToToolbar) return;
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
	}, [selectionMode, pageHasItems, bridgeToToolbar]);

	return <BulkSelectionContext.Provider value={value}>{children}</BulkSelectionContext.Provider>;
}

export function useBulkSelectionContext(): BulkSelectionContextValue {
	const ctx = use(BulkSelectionContext);
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
	return use(BulkSelectionContext);
}

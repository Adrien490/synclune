"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { useAdminListBulkPendingStore } from "@/shared/stores/use-admin-list-bulk-pending-store";

/**
 * Action en cours sur un sous-ensemble d'items d'une liste admin.
 *
 * Sert au feedback visuel "optimistic-feel" pendant une bulk-action :
 * - `archive` / `restore` → badge status fade-out
 * - `delete` → opacite-50 + ligne barree
 * - `status` → mini spinner pres du badge
 * - `attach-collection` → mini badge "ajout..." sous le titre
 * - `publish` / `hide` → reviews : badge status fade-out
 * - `feature` / `unfeature` → collections : badge "À la une" fade-out
 * - `activate` / `deactivate` → colors/materials/product-types : badge isActive fade
 */
export type AdminListPendingKind =
	| "archive"
	| "restore"
	| "delete"
	| "status"
	| "attach-collection"
	| "publish"
	| "hide"
	| "feature"
	| "unfeature"
	| "activate"
	| "deactivate"
	| "promote"
	| "demote"
	| "approve"
	| "reject"
	| "cancel";

interface AdminListPendingContextValue {
	pendingIds: ReadonlySet<string>;
	pendingKind: AdminListPendingKind | null;
	isPending: (id: string) => boolean;
	startPending: (ids: string[], kind: AdminListPendingKind) => void;
	clearPending: () => void;
}

const AdminListPendingContext = createContext<AdminListPendingContextValue | null>(null);

interface AdminListPendingProviderProps {
	children: ReactNode;
}

/**
 * Provider qui tracke les ids actuellement traites par une bulk-action.
 *
 * Le hook `useBulkActionWithToast` n'est pas modifie ici : c'est aux bars
 * d'actions de declencher `startPending(ids, kind)` au submit et `clearPending()`
 * apres completion (le toast/refresh fait deja le reste).
 *
 * Les items de la liste appellent `isPending(id)` pour rendre un overlay :
 *   - `opacity-50` / `aria-busy` (ResponsiveCard)
 *   - mini Loader2 sur le badge concerne
 *
 * Pattern volontairement minimaliste : pas de useOptimistic complet (qui
 * exigerait de lifter `products` dans un Client Component) — juste un signal
 * "tu vas etre mute, montre-le". La verite reste serveur via revalidation.
 */
export function AdminListPendingProvider({ children }: AdminListPendingProviderProps) {
	const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
	const [pendingKind, setPendingKind] = useState<AdminListPendingKind | null>(null);

	const startPending = (ids: string[], kind: AdminListPendingKind) => {
		setPendingIds(new Set(ids));
		setPendingKind(kind);
	};

	const clearPending = () => {
		setPendingIds(new Set());
		setPendingKind(null);
	};

	const isPending = (id: string) => pendingIds.has(id);

	const value: AdminListPendingContextValue = {
		pendingIds,
		pendingKind,
		isPending,
		startPending,
		clearPending,
	};

	// Publie l'état global pour les contrôles hors-tree (ex. ProductsBottomBar).
	useEffect(() => {
		useAdminListBulkPendingStore.setState({ pendingKind });
		return () => {
			useAdminListBulkPendingStore.setState({ pendingKind: null });
		};
	}, [pendingKind]);

	return (
		<AdminListPendingContext.Provider value={value}>{children}</AdminListPendingContext.Provider>
	);
}

export function useAdminListPendingContext(): AdminListPendingContextValue {
	const ctx = useContext(AdminListPendingContext);
	if (!ctx) {
		throw new Error("useAdminListPendingContext must be used inside <AdminListPendingProvider>");
	}
	return ctx;
}

/**
 * Hook safe — retourne null si pas de provider parent.
 */
export function useAdminListPendingContextOptional(): AdminListPendingContextValue | null {
	return useContext(AdminListPendingContext);
}

"use client";

import { createContext, use, useDeferredValue, useEffect, useState, type ReactNode } from "react";

import { ADMIN_PENDING_LABELS } from "@/shared/constants/admin-pending-labels";
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
	/**
	 * Libellé items pour l'annonce SR centralisée (« 12 produits en cours… »).
	 * Optionnel — default "élément/éléments" si non fourni.
	 */
	itemsLabel?: { singular: string; plural: string };
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
export function AdminListPendingProvider({ children, itemsLabel }: AdminListPendingProviderProps) {
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
		<AdminListPendingContext.Provider value={value}>
			<AdminListPendingAnnouncer itemsLabel={itemsLabel} />
			{children}
		</AdminListPendingContext.Provider>
	);
}

/**
 * Announcer SR centralisé pour les bulk-actions en cours.
 *
 * Remplace les `aria-live="polite"` individuels sur chaque badge pending (qui
 * spammaient le SR de N annonces simultanées sur un bulk de N items). Une seule
 * annonce polite consolidée — recalculée via `useDeferredValue` pour éviter
 * les rebonds rapides.
 */
function AdminListPendingAnnouncer({
	itemsLabel,
}: {
	itemsLabel?: { singular: string; plural: string };
}) {
	const ctx = use(AdminListPendingContext);
	const count = ctx?.pendingIds.size ?? 0;
	const kind = ctx?.pendingKind ?? null;

	const label =
		count > 1 ? (itemsLabel?.plural ?? "éléments") : (itemsLabel?.singular ?? "élément");

	const message = count > 0 && kind ? `${ADMIN_PENDING_LABELS[kind]} ${count} ${label}` : "";

	const deferredMessage = useDeferredValue(message);

	return (
		<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
			{deferredMessage}
		</div>
	);
}

export function useAdminListPendingContext(): AdminListPendingContextValue {
	const ctx = use(AdminListPendingContext);
	if (!ctx) {
		throw new Error("useAdminListPendingContext must be used inside <AdminListPendingProvider>");
	}
	return ctx;
}

/**
 * Hook safe — retourne null si pas de provider parent.
 */
export function useAdminListPendingContextOptional(): AdminListPendingContextValue | null {
	return use(AdminListPendingContext);
}

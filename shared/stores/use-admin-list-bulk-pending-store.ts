import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { AdminListPendingKind } from "@/shared/contexts/admin-list-pending-context";

interface AdminListBulkPendingState {
	pendingKind: AdminListPendingKind | null;
}

interface AdminListBulkPendingActions {
	setPendingKind: (kind: AdminListPendingKind | null) => void;
}

type AdminListBulkPendingStore = AdminListBulkPendingState & AdminListBulkPendingActions;

/**
 * Bridge global lu par les contrôles rendus HORS de l'arbre d'un
 * `AdminListPendingProvider` (ex. `ProductsBottomBar`, sticky-action-bar,
 * portails). Le Provider sync ce store via `useEffect` au mount/update — au
 * unmount, il reset à `null`.
 *
 * Permet à un bouton "Actualiser" placé au-dessus de la liste de se
 * désactiver pendant qu'une bulk-action tourne, sans devoir remonter le
 * Provider plus haut dans le tree (page.tsx reste Server Component).
 */
export const useAdminListBulkPendingStore = create<AdminListBulkPendingStore>()(
	devtools(
		(set) => ({
			pendingKind: null,
			setPendingKind: (kind) => set({ pendingKind: kind }, false, "setPendingKind"),
		}),
		{
			name: "AdminListBulkPendingStore",
			enabled: process.env.NODE_ENV === "development",
		},
	),
);

import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { AdminListSelectionStore } from "@/shared/types/store.types";

/**
 * Bridge entre `BulkSelectionProvider` (par liste, pattern Mail iOS) et
 * `AdminMobileBottomBar` (rendue dans un portal au niveau du shell admin).
 *
 * La bottom-bar globale est portalisée hors de l'arbre des listes : elle ne peut
 * donc pas consommer `BulkSelectionContext` directement. Ce store sert de pont
 * pour exposer un toggle « Sélection » thumb-friendly dans la bottom-bar
 * globale qui contrôle le mode sélection de la liste actuellement montée.
 *
 * Une seule liste est active à la fois sur mobile (la page courante) — le
 * provider auto-register son control au mount et le retire au unmount.
 */
export const useAdminListSelectionStore = create<AdminListSelectionStore>()(
	devtools(
		(set) => ({
			control: null,
			register: (control) => set({ control }, false, "register"),
			unregister: () => set({ control: null }, false, "unregister"),
		}),
		{ name: "AdminListSelectionStore", enabled: process.env.NODE_ENV === "development" },
	),
);

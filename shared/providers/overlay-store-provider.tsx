"use client";

import { createContext, use, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "zustand";

import { createAlertDialogStore } from "@/shared/stores/alert-dialog-store";
import { createDialogStore } from "@/shared/stores/dialog-store";
import { createSheetStore } from "@/shared/stores/sheet-store";
import type {
	AlertDialogData,
	AlertDialogStore,
	DialogData,
	DialogStore,
	SheetId,
	SheetStore,
} from "@/shared/types/store.types";

/**
 * Les trois stores d'overlay (dialog, sheet, alert-dialog), en UN provider.
 *
 * ## Pourquoi ils sont réunis
 *
 * `app/layout.tsx` empilait `DialogStoreProvider > SheetStoreProvider >
 * AlertDialogStoreProvider` — trois fichiers de 52 à 64 lignes qui étaient le
 * MÊME code : un `useState(() => createXStore())`, un `createContext`, un hook
 * de sélection qui throw hors provider. Trois paliers dans le layout racine, sur
 * toutes les routes, pour trois objets créés au même instant et jamais montés
 * séparément (vérifié : aucun des trois n'a jamais eu d'autre site de montage).
 *
 * ## Pourquoi les STORES restent trois, et pas un
 *
 * Ils portent trois espaces d'identifiants distincts. Un `dialogId` « delete-color »
 * et un `alertDialogId` homonyme doivent pouvoir coexister sans se fermer l'un
 * l'autre, et `sheet` est mono-ouvert (`openSheet: SheetId | null`) là où les deux
 * autres sont multi-entrées. Fusionner les états ferait de l'exclusivité du sheet
 * une règle globale.
 *
 * ## Pourquoi une FABRIQUE et pas un `create()` de module
 *
 * `badge-counts-store` et `use-overlay-stack-store` sont des singletons de module
 * sans provider — le motif inverse serait donc défendable en production. Ce qui
 * tranche, c'est le test : une fabrique par montage donne à chaque `render()` un
 * store neuf, alors qu'un singleton de module ferait fuir un dialog ouvert d'un
 * test au suivant (RTL ne nettoie pas tout seul dans ce dépôt).
 */

type DialogStoreApi = ReturnType<typeof createDialogStore>;
type SheetStoreApi = ReturnType<typeof createSheetStore>;
type AlertDialogStoreApi = ReturnType<typeof createAlertDialogStore>;

interface OverlayStores {
	dialog: DialogStoreApi;
	sheet: SheetStoreApi;
	alertDialog: AlertDialogStoreApi;
}

const OverlayStoreContext = createContext<OverlayStores | undefined>(undefined);

export const OverlayStoreProvider = ({ children }: { children: React.ReactNode }) => {
	const [stores] = useState<OverlayStores>(() => ({
		dialog: createDialogStore(),
		sheet: createSheetStore(),
		alertDialog: createAlertDialogStore(),
	}));

	return <OverlayStoreContext value={stores}>{children}</OverlayStoreContext>;
};

/**
 * Referme le sheet ouvert au changement de route. Monté en FRÈRE dans
 * `app/layout.tsx`, pas dans le provider.
 *
 * ⚠️ Il vivait dans `SheetStoreProvider` jusqu'au 2026-08-07. En le laissant dans
 * le provider fusionné, il aurait imposé `usePathname()` à TOUT test montant
 * l'`OverlayStoreProvider` — y compris ceux qui ne testent que des dialogs, dont
 * le mock de `next/navigation` n'expose pas ce hook. Un provider ne doit pas
 * traîner l'effet de bord d'un seul de ses trois stores.
 *
 * Le comportement lui-même est un invariant : la JSDoc de `use-toolbar-drawer.ts`
 * s'appuie dessus pour justifier que l'état des tiroirs admin vive dans ce store
 * plutôt que dans un `useState` local.
 *
 * ⚠️ Sa frontière `Suspense` est obligatoire côté appelant : `usePathname()` est
 * une source dynamique sous `cacheComponents`.
 */
export function SheetAutoCloseOnNavigation() {
	const close = useSheetStore((state) => state.close);
	const pathname = usePathname();

	useEffect(() => {
		close();
	}, [pathname, close]);

	return null;
}

function useOverlayStores(): OverlayStores {
	const stores = use(OverlayStoreContext);

	if (!stores) {
		throw new Error("Les hooks d'overlay doivent être utilisés dans un OverlayStoreProvider");
	}

	return stores;
}

// ────────────────────────────────────────────────────────────── Dialog

const useDialogStore = <T,>(selector: (store: DialogStore) => T): T =>
	useStore(useOverlayStores().dialog, selector);

/**
 * Hook pour gérer l'état d'un dialog spécifique
 * @param dialogId - Identifiant unique du dialog
 * @returns Object avec isOpen, open, close, toggle, data, clearData
 */
export const useDialog = <T extends Record<string, unknown> = Record<string, unknown>>(
	dialogId: string,
) => {
	const isOpen = useDialogStore((state) => state.isDialogOpen(dialogId));
	const data = useDialogStore((state) => state.getDialogData<T>(dialogId));
	const openDialog = useDialogStore((state) => state.openDialog);
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const toggleDialog = useDialogStore((state) => state.toggleDialog);
	const clearDialogData = useDialogStore((state) => state.clearDialogData);

	return {
		isOpen,
		data,
		open: (dialogData?: DialogData) => openDialog(dialogId, dialogData),
		close: () => closeDialog(dialogId),
		toggle: () => toggleDialog(dialogId),
		clearData: () => clearDialogData(dialogId),
	};
};

// ─────────────────────────────────────────────────────────────── Sheet

export const useSheetStore = <T,>(selector: (store: SheetStore) => T): T =>
	useStore(useOverlayStores().sheet, selector);

/**
 * Hook pour gérer l'état d'un sheet spécifique
 * @param sheetId - Identifiant unique du sheet
 * @returns Object avec isOpen, open, close, toggle
 */
export const useSheet = (sheetId: SheetId) => {
	const isOpen = useSheetStore((state) => state.isOpen(sheetId));
	const openFn = useSheetStore((state) => state.open);
	const close = useSheetStore((state) => state.close);
	const toggleFn = useSheetStore((state) => state.toggle);

	return {
		isOpen,
		open: () => openFn(sheetId),
		close,
		toggle: () => toggleFn(sheetId),
	};
};

// ───────────────────────────────────────────────────────── AlertDialog

export const useAlertDialogStore = <T,>(selector: (store: AlertDialogStore) => T): T =>
	useStore(useOverlayStores().alertDialog, selector);

/**
 * Hook pour gérer l'état d'un AlertDialog spécifique
 * @param dialogId - Identifiant unique du dialog
 * @returns Object avec isOpen, open, close, data, clearData
 *
 * @example
 * // Dans un composant qui ouvre l'AlertDialog
 * const deleteDialog = useAlertDialog("delete-product-sku");
 * deleteDialog.open({ itemId: sku.id, itemName: sku.sku });
 */
export const useAlertDialog = <T extends AlertDialogData = AlertDialogData>(dialogId: string) => {
	const isOpen = useAlertDialogStore((state) => state.isAlertDialogOpen(dialogId));
	const data = useAlertDialogStore((state) => state.getAlertDialogData<T>(dialogId));
	const openAlertDialog = useAlertDialogStore((state) => state.openAlertDialog);
	const closeAlertDialog = useAlertDialogStore((state) => state.closeAlertDialog);
	const clearAlertDialogData = useAlertDialogStore((state) => state.clearAlertDialogData);

	return {
		isOpen,
		data,
		open: (dialogData?: T) => openAlertDialog(dialogId, dialogData),
		close: () => closeAlertDialog(dialogId),
		clearData: () => clearAlertDialogData(dialogId),
	};
};

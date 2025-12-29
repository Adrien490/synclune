"use client"

import { createContext, useContext, useRef } from "react"
import { useStore } from "zustand"

import { createAlertDialogStore } from "@/shared/stores/alert-dialog-store"
import type {
	AlertDialogData,
	AlertDialogStore,
	AlertDialogStoreProviderProps,
} from "@/shared/types/store.types"

export type AlertDialogStoreApi = ReturnType<typeof createAlertDialogStore>

export const AlertDialogStoreContext = createContext<
	AlertDialogStoreApi | undefined
>(undefined)

export const AlertDialogStoreProvider = ({
	children,
}: AlertDialogStoreProviderProps) => {
	const storeRef = useRef<AlertDialogStoreApi | null>(null);
	if (storeRef.current === null) {
		storeRef.current = createAlertDialogStore();
	}

	return (
		<AlertDialogStoreContext.Provider value={storeRef.current}>
			{children}
		</AlertDialogStoreContext.Provider>
	);
};

export const useAlertDialogStore = <T,>(
	selector: (store: AlertDialogStore) => T
): T => {
	const alertDialogStoreContext = useContext(AlertDialogStoreContext);

	if (!alertDialogStoreContext) {
		throw new Error(
			`useAlertDialogStore must be used within AlertDialogStoreProvider`
		);
	}

	return useStore(alertDialogStoreContext, selector);
};

/**
 * Hook pour gérer l'état d'un AlertDialog spécifique
 * @param dialogId - Identifiant unique du dialog
 * @returns Object avec isOpen, open, close, data, clearData
 *
 * @example
 * // Dans un composant qui ouvre l'AlertDialog
 * const deleteDialog = useAlertDialog("delete-product-sku");
 * deleteDialog.open({ itemId: sku.id, itemName: sku.sku });
 *
 * // Dans le composant AlertDialog
 * const deleteDialog = useAlertDialog("delete-product-sku");
 * const data = deleteDialog.data as { itemId: string; itemName: string };
 * <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && deleteDialog.close()}>
 */
export const useAlertDialog = <T extends AlertDialogData = AlertDialogData>(
	dialogId: string
) => {
	const isOpen = useAlertDialogStore((state) =>
		state.isAlertDialogOpen(dialogId)
	);
	const data = useAlertDialogStore((state) =>
		state.getAlertDialogData<T>(dialogId)
	);
	const openAlertDialog = useAlertDialogStore((state) => state.openAlertDialog);
	const closeAlertDialog = useAlertDialogStore(
		(state) => state.closeAlertDialog
	);
	const clearAlertDialogData = useAlertDialogStore(
		(state) => state.clearAlertDialogData
	);

	return {
		isOpen,
		data,
		open: (dialogData?: T) => openAlertDialog(dialogId, dialogData),
		close: () => closeAlertDialog(dialogId),
		clearData: () => clearAlertDialogData(dialogId),
	};
};

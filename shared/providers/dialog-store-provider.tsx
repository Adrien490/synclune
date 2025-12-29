"use client"

import { createContext, useContext, useRef } from "react"
import { useStore } from "zustand"

import { createDialogStore } from "@/shared/stores/dialog-store"
import type {
	DialogStore,
	DialogStoreProviderProps,
} from "@/shared/types/store.types"

export type DialogStoreApi = ReturnType<typeof createDialogStore>

export const DialogStoreContext = createContext<DialogStoreApi | undefined>(
	undefined
)

export const DialogStoreProvider = ({ children }: DialogStoreProviderProps) => {
	const storeRef = useRef<DialogStoreApi | null>(null);
	if (storeRef.current === null) {
		storeRef.current = createDialogStore();
	}

	return (
		<DialogStoreContext.Provider value={storeRef.current}>
			{children}
		</DialogStoreContext.Provider>
	);
};

export const useDialogStore = <T,>(selector: (store: DialogStore) => T): T => {
	const dialogStoreContext = useContext(DialogStoreContext);

	if (!dialogStoreContext) {
		throw new Error(`useDialogStore must be used within DialogStoreProvider`);
	}

	return useStore(dialogStoreContext, selector);
};

/**
 * Hook pour gérer l'état d'un dialog spécifique
 * @param dialogId - Identifiant unique du dialog
 * @returns Object avec isOpen, open, close, toggle, data, clearData
 */
export const useDialog = <T extends Record<string, unknown> = Record<string, unknown>>(
	dialogId: string
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
		open: (dialogData?: T) => openDialog(dialogId, dialogData),
		close: () => closeDialog(dialogId),
		toggle: () => toggleDialog(dialogId),
		clearData: () => clearDialogData(dialogId),
	};
};

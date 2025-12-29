"use client"

import { createContext, useContext, useRef } from "react"
import { useStore } from "zustand"

import { createSheetStore } from "@/shared/stores/sheet-store"
import type {
	SheetId,
	SheetStore,
	SheetStoreProviderProps,
} from "@/shared/types/store.types"

export type SheetStoreApi = ReturnType<typeof createSheetStore>

export const SheetStoreContext = createContext<SheetStoreApi | undefined>(
	undefined
)

export const SheetStoreProvider = ({ children }: SheetStoreProviderProps) => {
	const storeRef = useRef<SheetStoreApi | null>(null);
	if (storeRef.current === null) {
		storeRef.current = createSheetStore();
	}

	return (
		<SheetStoreContext.Provider value={storeRef.current}>
			{children}
		</SheetStoreContext.Provider>
	);
};

export const useSheetStore = <T,>(selector: (store: SheetStore) => T): T => {
	const sheetStoreContext = useContext(SheetStoreContext);

	if (!sheetStoreContext) {
		throw new Error(`useSheetStore must be used within SheetStoreProvider`);
	}

	return useStore(sheetStoreContext, selector);
};

/**
 * Hook pour gerer l'etat d'un sheet specifique
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

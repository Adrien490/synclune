"use client";

import { Suspense, createContext, use, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "zustand";

import { createSheetStore } from "@/shared/stores/sheet-store";
import type { SheetId, SheetStore, SheetStoreProviderProps } from "@/shared/types/store.types";

type SheetStoreApi = ReturnType<typeof createSheetStore>;

const SheetStoreContext = createContext<SheetStoreApi | undefined>(undefined);

function SheetAutoCloseOnNavigation({ store }: { store: SheetStoreApi }) {
	const pathname = usePathname();

	useEffect(() => {
		store.getState().close();
	}, [pathname, store]);

	return null;
}

export const SheetStoreProvider = ({ children }: SheetStoreProviderProps) => {
	const [store] = useState(() => createSheetStore());

	return (
		<SheetStoreContext.Provider value={store}>
			<Suspense fallback={null}>
				<SheetAutoCloseOnNavigation store={store} />
			</Suspense>
			{children}
		</SheetStoreContext.Provider>
	);
};

export const useSheetStore = <T,>(selector: (store: SheetStore) => T): T => {
	const sheetStoreContext = use(SheetStoreContext);

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

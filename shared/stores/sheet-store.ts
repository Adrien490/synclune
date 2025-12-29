import { createStore } from "zustand/vanilla"

import type {
	SheetId,
	SheetState,
	SheetStore,
} from "@/shared/types/store.types"

export type { SheetId, SheetState, SheetActions, SheetStore } from "@/shared/types/store.types"

export const defaultInitState: SheetState = {
	openSheet: null,
};

export const createSheetStore = (initState: SheetState = defaultInitState) => {
	return createStore<SheetStore>()((set, get) => ({
		...initState,
		open: (sheetId: SheetId) => set({ openSheet: sheetId }),
		close: () => set({ openSheet: null }),
		toggle: (sheetId: SheetId) =>
			set((state) => ({
				openSheet: state.openSheet === sheetId ? null : sheetId,
			})),
		isOpen: (sheetId: SheetId) => get().openSheet === sheetId,
	}));
};

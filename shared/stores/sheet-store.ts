import { createStore } from "zustand/vanilla";

/**
 * Identifiants des sheets disponibles
 * Extensible pour futurs sheets
 */
export type SheetId = "cart";

export type SheetState = {
	openSheet: SheetId | null;
};

export type SheetActions = {
	open: (sheetId: SheetId) => void;
	close: () => void;
	toggle: (sheetId: SheetId) => void;
	isOpen: (sheetId: SheetId) => boolean;
};

export type SheetStore = SheetState & SheetActions;

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

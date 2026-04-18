import { createStore } from "zustand/vanilla";
import { devtools } from "zustand/middleware";

import type { SheetId, SheetState, SheetStore } from "@/shared/types/store.types";

export type { SheetStore } from "@/shared/types/store.types";

export const defaultInitState: SheetState = {
	openSheet: null,
};

export const createSheetStore = (initState: SheetState = defaultInitState) => {
	return createStore<SheetStore>()(
		devtools(
			(set, get) => ({
				...initState,
				open: (sheetId: SheetId) => set({ openSheet: sheetId }, false, `open/${sheetId}`),
				close: () => set({ openSheet: null }, false, "close"),
				toggle: (sheetId: SheetId) =>
					set(
						(state) => ({
							openSheet: state.openSheet === sheetId ? null : sheetId,
						}),
						false,
						`toggle/${sheetId}`,
					),
				isOpen: (sheetId: SheetId) => get().openSheet === sheetId,
			}),
			{ name: "SheetStore", enabled: process.env.NODE_ENV === "development" },
		),
	);
};

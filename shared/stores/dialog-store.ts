import { createStore } from "zustand/vanilla";

import type { DialogData, DialogState, DialogStore } from "@/shared/types/store.types";
import {
	openEntry,
	closeEntry,
	toggleEntry,
	clearEntry,
	isEntryOpen,
	getEntryData,
} from "./overlay-state-helpers";

export type {
	DialogData,
	DialogState,
	DialogActions,
	DialogStore,
} from "@/shared/types/store.types";

export const defaultInitState: DialogState = {
	dialogs: {},
};

export const createDialogStore = (initState: DialogState = defaultInitState) => {
	return createStore<DialogStore>()((set, get) => ({
		...initState,
		openDialog: (dialogId: string, data?: DialogData) =>
			set((state) => ({ dialogs: openEntry(state.dialogs, dialogId, data) })),
		closeDialog: (dialogId: string) =>
			set((state) => ({ dialogs: closeEntry(state.dialogs, dialogId) })),
		toggleDialog: (dialogId: string) =>
			set((state) => ({ dialogs: toggleEntry(state.dialogs, dialogId) })),
		isDialogOpen: (dialogId: string) => isEntryOpen(get().dialogs, dialogId),
		getDialogData: <T extends DialogData = DialogData>(dialogId: string): T | undefined =>
			getEntryData<DialogData, T>(get().dialogs, dialogId),
		clearDialogData: (dialogId: string) =>
			set((state) => ({ dialogs: clearEntry(state.dialogs, dialogId) })),
	}));
};

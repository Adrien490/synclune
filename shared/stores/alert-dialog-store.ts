import { createStore } from "zustand/vanilla";

import type {
	AlertDialogData,
	AlertDialogState,
	AlertDialogStore,
} from "@/shared/types/store.types";
import {
	openEntry,
	closeEntry,
	clearEntry,
	isEntryOpen,
	getEntryData,
} from "./overlay-state-helpers";

export type {
	AlertDialogData,
	AlertDialogState,
	AlertDialogActions,
	AlertDialogStore,
} from "@/shared/types/store.types";

export const defaultInitState: AlertDialogState = {
	alertDialogs: {},
};

export const createAlertDialogStore = (initState: AlertDialogState = defaultInitState) => {
	return createStore<AlertDialogStore>()((set, get) => ({
		...initState,
		openAlertDialog: (dialogId: string, data?: AlertDialogData) =>
			set((state) => ({ alertDialogs: openEntry(state.alertDialogs, dialogId, data) })),
		closeAlertDialog: (dialogId: string) =>
			set((state) => ({ alertDialogs: closeEntry(state.alertDialogs, dialogId) })),
		isAlertDialogOpen: (dialogId: string) => isEntryOpen(get().alertDialogs, dialogId),
		getAlertDialogData: <T extends AlertDialogData = AlertDialogData>(
			dialogId: string,
		): T | undefined => getEntryData<AlertDialogData, T>(get().alertDialogs, dialogId),
		clearAlertDialogData: (dialogId: string) =>
			set((state) => ({ alertDialogs: clearEntry(state.alertDialogs, dialogId) })),
	}));
};
